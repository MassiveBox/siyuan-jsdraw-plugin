import {MaterialIconProvider} from "@js-draw/material-icons";
import {PluginAsset, PluginFile} from "@/file";
import {JSON_MIME, STORAGE_PATH, SVG_MIME, TOOLBAR_FILENAME} from "@/const";
import {refreshImagesForFile} from "@/refresh";
import Editor, {
    AbstractToolbar,
    BackgroundComponentBackgroundType,
    BaseWidget,
    Color4,
    EditorEventType, getLocalizationTable,
    Mat33,
    Vec2,
    Viewport
} from "js-draw";
import {Dialog, getFrontend, openTab, Plugin} from "siyuan";
import DrawJSPlugin from "@/index";
import {EditorOptions} from "@/config";
import 'js-draw/styles';
import {
    ErrorReporter,
    GenericSaveError, InternationalizedError, NoFilenameError
} from "@/errors";

type CloseAction = 'save' | 'discard';


function confirmUnsavedChanges(
    i18n: any,
    oldSVG: string | null,
    newSVG: string
): Promise<CloseAction> {
    const oldPreview = oldSVG
        ? `<div style="flex:1; text-align:center;">
            <div style="font-weight:bold; margin-bottom:4px;">${i18n.unsavedConfirm.oldVersion}</div>
            <div style="border:1px solid var(--b3-border-color); border-radius:4px; overflow:hidden; background:var(--b3-theme-background); padding:4px;">
                <img src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(oldSVG)}" style="width:100%; height:auto; max-height:200px; object-fit:contain;" />
            </div>
        </div>`
        : '';
    const newPreview = `<div style="flex:1; text-align:center;">
        <div style="font-weight:bold; margin-bottom:4px;">${i18n.unsavedConfirm.autoSavedVersion}</div>
        <div style="border:1px solid var(--b3-border-color); border-radius:4px; overflow:hidden; background:var(--b3-theme-background); padding:4px;">
            <img src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(newSVG)}" style="width:100%; height:auto; max-height:200px; object-fit:contain;" />
        </div>
    </div>`;

    return new Promise((resolve) => {
        let resolved = false;
        const dialog = new Dialog({
            title: i18n.unsavedConfirm.title,
            content: `<div class="b3-dialog__content">
    <div class="ft__breakword">${i18n.unsavedConfirm.message}</div>
    <div style="display:flex; gap:8px; margin-top:8px;">
        ${oldPreview}${newPreview}
    </div>
</div>
<div class="b3-dialog__action">
    <button class="b3-button b3-button--error" data-action="discard">${i18n.unsavedConfirm.discard}</button><div class="fn__space"></div>
    <button class="b3-button b3-button--success" data-action="save">${i18n.unsavedConfirm.save}</button>
</div>`,
            width: "640px",
            destroyCallback: () => {
                if (!resolved) resolve('save');
            },
        });

        const buttons = dialog.element.querySelectorAll(".b3-button");
        buttons.forEach((btn) => {
            btn.addEventListener("click", () => {
                const action = (btn as HTMLElement).getAttribute("data-action") as CloseAction;
                resolved = true;
                dialog.destroy();
                resolve(action);
            });
        });
    });
}

export class PluginEditor {

    private readonly element: HTMLElement;
    private readonly editor: Editor;

    private drawingFile: PluginAsset;
    private toolbarFile: PluginFile;

    private readonly filename: string;

    private keepEditorPosition: boolean;
    private isDirty: boolean = false;
    private isMoved: boolean = false;

    private saveButton: BaseWidget | null = null;
    private toolbar: AbstractToolbar | null = null;
    private savedSVG: string | null = null;

    private static readonly viewParam: string = 'editorview';

    getElement(): HTMLElement { return this.element; }
    getEditor(): Editor { return this.editor; }
    getFilename(): string { return this.filename; }
    getIsDirty(): boolean { return this.isDirty; }
    async autosave(): Promise<void> { await this.saveCallback(true); }

    setOnClose(callback: () => void): void {
        if (this.toolbar) {
            this.toolbar.addExitButton(callback);
        }
    }

    getSavedSVG(): string | null {
        return this.savedSVG;
    }

    async restoreSavedVersion(): Promise<void> {
        if (this.savedSVG != null) {
            this.drawingFile.setContent(this.savedSVG);
            await this.drawingFile.save();
            try { refreshImagesForFile(this.filename); } catch (e) { console.warn(e); }
        }
    }

    getCurrentSVG(): string {
        return this.serializeSVGWithViewport();
    }

    private serializeSVGWithViewport(): string {
        const svgElem = this.editor.toSVG();
        const rect = this.editor.viewport.visibleRect;
        const zoom = this.editor.viewport.getScaleFactor();
        Array.from(svgElem.attributes).forEach(attr => {
            if (attr.name.toLowerCase() === PluginEditor.viewParam) {
                svgElem.removeAttribute(attr.name);
            }
        });
        svgElem.setAttribute(PluginEditor.viewParam, `${rect.x} ${rect.y} ${zoom}`);
        return svgElem.outerHTML;
    }

    private setDirty(dirty: boolean): void {
        this.isDirty = dirty;
        this.updateSaveButtonState(!this.isDirty);
    }

    private setMoved(moved: boolean): void {
        if(this.keepEditorPosition) {
            this.isMoved = moved;
            this.updateSaveButtonState(!this.isMoved);
        }
    }

    private updateSaveButtonState(disabledCondition: boolean): void {
        if (this.saveButton) {
            this.saveButton.setDisabled(disabledCondition);
        }
    }

    private constructor(filename: string) {

        this.filename = filename;

        this.element = document.createElement("div");
        this.element.style.height = '100%';
        this.editor = new Editor(this.element, {
            localization: getLocalizationTable([window.siyuan.config.lang]),
            iconProvider: new MaterialIconProvider(),
        });

        const styleElement = document.createElement('style');
        styleElement.innerHTML = `
            canvas.wetInkCanvas {
                cursor: url('/plugins/siyuan-jsdraw-plugin/webapp/cursor.png') 3 3, none;
            }
        `;
        this.element.appendChild(styleElement);

        this.editor.dispatch(this.editor.setBackgroundStyle({ autoresize: true }), false);
        this.editor.getRootElement().style.height = '100%';

    }

    static async create(filename: string, defaultEditorOptions: EditorOptions): Promise<PluginEditor> {

        const instance = new PluginEditor(filename);

        await instance.restoreOrInitFile(defaultEditorOptions);
        await instance.genToolbar();

        return instance;

    }

    async restoreOrInitFile(defaultEditorOptions: EditorOptions) {

        this.drawingFile = new PluginAsset(this.filename, SVG_MIME);
        await this.drawingFile.loadFromSiYuanFS();
        const drawingContent = this.drawingFile.getContent();
        this.savedSVG = drawingContent;
        this.keepEditorPosition = defaultEditorOptions.restorePosition;

        if(drawingContent != null) {

            await this.editor.loadFromSVG(drawingContent);

            // restore position and zoom
            const svgElem = new DOMParser().parseFromString(drawingContent, SVG_MIME).documentElement;
            const editorViewStr = svgElem.getAttribute(PluginEditor.viewParam);
            if(editorViewStr != null && defaultEditorOptions.restorePosition) {
                try {
                    const [viewBoxOriginX, viewBoxOriginY, zoom] = editorViewStr.split(' ').map(x => parseFloat(x));
                    this.editor.dispatch(Viewport.transformBy(Mat33.scaling2D(zoom)));
                    this.editor.dispatch(Viewport.transformBy(Mat33.translation(Vec2.of(
                        - viewBoxOriginX,
                        - viewBoxOriginY
                    ))));
                }catch (e){}
            }

        }else{
            // it's a new drawing
            this.editor.dispatch(this.editor.setBackgroundStyle({
                color: Color4.fromHex(defaultEditorOptions.background),
                type: defaultEditorOptions.grid ? BackgroundComponentBackgroundType.Grid : BackgroundComponentBackgroundType.SolidColor,
                autoresize: true
            }));
        }

        if (this.savedSVG == null) {
            this.savedSVG = this.serializeSVGWithViewport();
        }

    }

    async genToolbar() {

        const toolbar = this.editor.addToolbar();
        this.toolbar = toolbar;

        // save button - store reference and initialize as disabled
        this.saveButton = toolbar.addSaveButton(async () => {
            await this.saveCallback();
        });
        this.saveButton.setDisabled(true); // Start with clean state

        // restore toolbarFile state
        this.toolbarFile = new PluginFile(STORAGE_PATH, TOOLBAR_FILENAME, JSON_MIME);
        await this.toolbarFile.loadFromSiYuanFS();
        if(this.toolbarFile.getContent() != null) {
            toolbar.deserializeState(this.toolbarFile.getContent());
        }

        // save toolbar config on tool change (toolbar state is not saved in SVGs!)
        this.editor.notifier.on(EditorEventType.ToolUpdated, () => {
            this.toolbarFile.setContent(toolbar.serializeState());
            this.toolbarFile.save();
        });

        // Set up change detection listeners
        this.setupChangeListeners();
    }

    private setupChangeListeners(): void {
        // Content changes (drawing, adding objects, etc.)
        this.editor.notifier.on(EditorEventType.CommandDone, () => this.setDirty(true));
        this.editor.notifier.on(EditorEventType.CommandUndone, () => this.setDirty(true));

        // Viewport changes (pan/zoom) - saved in SVG's editorView attribute
        this.editor.notifier.on(EditorEventType.ViewportChanged, () => this.setMoved(true));
    }

    private async saveCallback(silent: boolean = false) {

        const serialized = this.serializeSVGWithViewport();

        try {
            this.drawingFile.setContent(serialized);
            await this.drawingFile.save();

            // Force refresh all images referencing this file
            try {
                refreshImagesForFile(this.filename);
            } catch (refreshError) {
                console.warn('Image refresh failed, but save succeeded:', refreshError);
            }

            // Mark as clean - disable save button
            this.setDirty(false);
            this.setMoved(false);
            if (!silent) {
                this.savedSVG = serialized;
            }
        } catch (error) {
            if(error instanceof InternationalizedError) {
                ErrorReporter.error(error);
            }else{
                ErrorReporter.error(new GenericSaveError());
                console.error(error);
            }
            await navigator.clipboard.writeText(serialized);
            console.log("Couldn't save SVG: ", serialized)
            return;
        }

    }

}

export class EditorManager {

    private static readonly openEditors: Set<PluginEditor> = new Set();

    static registerEditor(editor: PluginEditor): void { EditorManager.openEditors.add(editor); }
    static unregisterEditor(editor: PluginEditor): void { EditorManager.openEditors.delete(editor); }
    static getOpenEditors(): ReadonlySet<PluginEditor> { return EditorManager.openEditors; }

    private editor: PluginEditor
    setEditor(editor: PluginEditor) { this.editor = editor;}

    static async create(filename: string, p: DrawJSPlugin) {
        let instance = new EditorManager();
        try {
            let editor = await PluginEditor.create(filename, p.config.options.editorOptions);
            instance.setEditor(editor);
            EditorManager.registerEditor(editor);
        }catch (error) {
            ErrorReporter.error(error);
        }
        return instance;
    }

    static registerTab(p: DrawJSPlugin) {
        p.addTab({
            'type': "whiteboard",
            async init() {
                const filename = this.data.filename;
                if (filename == null) {
                    ErrorReporter.error(new NoFilenameError());
                    return;
                }
                try {
                    const editor = await PluginEditor.create(filename, p.config.options.editorOptions);
                    this.element.appendChild(editor.getElement());
                    (this as any)._pluginEditor = editor;
                    EditorManager.registerEditor(editor);
                }catch (error){
                    ErrorReporter.error(error);
                }
            },
            beforeDestroy() {
                const editor = (this as any)._pluginEditor as PluginEditor | undefined;
                if (!editor?.getIsDirty()) {
                    if (editor) EditorManager.unregisterEditor(editor);
                    return;
                }

                const oldSVG = editor.getSavedSVG();
                const newSVG = editor.getCurrentSVG();

                editor.autosave().catch(e => console.warn('Auto-save failed:', e));

                confirmUnsavedChanges(p.i18n, oldSVG, newSVG)
                    .then(async (action) => {
                        if (action === 'discard') {
                            await editor.restoreSavedVersion();
                        }
                    })
                    .catch(e => console.warn('Rollback failed:', e))
                    .finally(() => { if (editor) EditorManager.unregisterEditor(editor); });
            }
        });
    }

    toTab(p: Plugin) {
        openTab({
            app: p.app,
            custom: {
                title: p.i18n.whiteboard,
                icon: 'iconDraw',
                id: "siyuan-jsdraw-pluginwhiteboard",
                data: {
                    filename: this.editor.getFilename(),
                }
            }
        });
    }

    toDialog(p: DrawJSPlugin) {
        const pluginEditor = this.editor;

        pluginEditor.setOnClose(async () => {
            if (!pluginEditor.getIsDirty()) {
                EditorManager.unregisterEditor(pluginEditor);
                dialog.destroy();
                return;
            }
            const oldSVG = pluginEditor.getSavedSVG();
            const newSVG = pluginEditor.getCurrentSVG();
            try {
                await pluginEditor.autosave();
                const action = await confirmUnsavedChanges(p.i18n, oldSVG, newSVG);
                if (action === 'discard') {
                    await pluginEditor.restoreSavedVersion();
                }
            } catch (e) {
                console.warn('Close handler failed:', e);
            }
            EditorManager.unregisterEditor(pluginEditor);
            dialog.destroy();
        });

        const dialog = new Dialog({
            width: "100vw",
            height: getFrontend() == "mobile" ? "100vh" : "90vh",
            content: `<div id="DrawingPanel" style="width:100%; height: 100%;"></div>`,
            disableClose: true,
        });
        dialog.element.querySelector("#DrawingPanel").appendChild(pluginEditor.getElement());
    }

    open(p: DrawJSPlugin) {
        if(getFrontend() != "mobile" && !p.config.options.dialogOnDesktop) {
            this.toTab(p);
        } else {
            this.toDialog(p);
        }
    }

}