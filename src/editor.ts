import {MaterialIconProvider} from "@js-draw/material-icons";
import {PluginAsset, PluginFile} from "@/file";
import {JSON_MIME, STORAGE_PATH, SVG_MIME, TOOLBAR_FILENAME} from "@/const";
import {refreshImagesForFile} from "@/refresh";
import Editor, {
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

export class PluginEditor {

    private readonly element: HTMLElement;
    private readonly editor: Editor;

    private drawingFile: PluginAsset;
    private toolbarFile: PluginFile;

    private readonly filename: string;

    private isDirty: boolean = false;
    private saveButton: BaseWidget | null = null;

    private static readonly viewParam: string = 'editorview';

    getElement(): HTMLElement { return this.element; }
    getEditor(): Editor { return this.editor; }
    getFilename(): string { return this.filename; }

    private setDirty(dirty: boolean): void {
        this.isDirty = dirty;
        this.updateSaveButtonState();
    }

    private updateSaveButtonState(): void {
        if (this.saveButton) {
            this.saveButton.setDisabled(!this.isDirty);
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

    }

    async genToolbar() {

        const toolbar = this.editor.addToolbar();

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
        this.editor.notifier.on(EditorEventType.ViewportChanged, () => this.setDirty(true));
    }

    private async saveCallback() {

        const svgElem = this.editor.toSVG();

        const rect = this.editor.viewport.visibleRect;
        const zoom = this.editor.viewport.getScaleFactor();

        Array.from(svgElem.attributes).forEach(attr => {
            if (attr.name.toLowerCase() === PluginEditor.viewParam) {
                svgElem.removeAttribute(attr.name); // fix duplicate param
            }
        });
        svgElem.setAttribute(PluginEditor.viewParam, `${rect.x} ${rect.y} ${zoom}`)

        try {
            this.drawingFile.setContent(svgElem.outerHTML);
            await this.drawingFile.save();

            // Force refresh all images referencing this file
            try {
                refreshImagesForFile(this.filename);
            } catch (refreshError) {
                console.warn('Image refresh failed, but save succeeded:', refreshError);
            }

            // Mark as clean - disable save button
            this.setDirty(false);
        } catch (error) {
            if(error instanceof InternationalizedError) {
                ErrorReporter.error(error);
            }else{
                ErrorReporter.error(new GenericSaveError());
                console.error(error);
            }
            await navigator.clipboard.writeText(svgElem.outerHTML);
            console.log("Couldn't save SVG: ", svgElem.outerHTML)
            return;
        }

    }

}

export class EditorManager {

    private editor: PluginEditor
    setEditor(editor: PluginEditor) { this.editor = editor;}

    static async create(filename: string, p: DrawJSPlugin) {
        let instance = new EditorManager();
        try {
            let editor = await PluginEditor.create(filename, p.config.options.editorOptions);
            instance.setEditor(editor);
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
                }catch (error){
                    ErrorReporter.error(error);
                }
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

    toDialog() {
        const dialog = new Dialog({
            width: "100vw",
            height: getFrontend() == "mobile" ? "100vh" : "90vh",
            content: `<div id="DrawingPanel" style="width:100%; height: 100%;"></div>`,
        });
        dialog.element.querySelector("#DrawingPanel").appendChild(this.editor.getElement());
    }

    open(p: DrawJSPlugin) {
        if(getFrontend() != "mobile" && !p.config.options.dialogOnDesktop) {
            this.toTab(p);
        } else {
            this.toDialog();
        }
    }

}