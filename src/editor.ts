import {MaterialIconProvider} from "@js-draw/material-icons";
import {PluginAsset, PluginFile} from "@/file";
import {JSON_MIME, STORAGE_PATH, SVG_MIME, TOOLBAR_FILENAME} from "@/const";
import Editor, {
    BackgroundComponentBackgroundType,
    BaseWidget,
    Color4,
    EditorEventType,
    Mat33,
    Vec2,
    Viewport
} from "js-draw";
import {Dialog, getFrontend, openTab, Plugin, showMessage} from "siyuan";
import {findSyncIDInProtyle, replaceSyncID} from "@/protyle";
import DrawJSPlugin from "@/index";
import {EditorOptions} from "@/config";
import 'js-draw/styles';
import {SyncIDNotFoundError, UnchangedProtyleError} from "@/errors";

export class PluginEditor {

    private readonly element: HTMLElement;
    private readonly editor: Editor;

    private drawingFile: PluginAsset;
    private toolbarFile: PluginFile;

    private readonly fileID: string;
    private syncID: string;

    getElement(): HTMLElement { return this.element; }
    getEditor(): Editor { return this.editor; }
    getFileID(): string { return this.fileID; }
    getSyncID(): string { return this.syncID; }
    setSyncID(syncID: string) { this.syncID = syncID; }

    private constructor(fileID: string) {

        this.fileID = fileID;

        this.element = document.createElement("div");
        this.element.style.height = '100%';
        this.editor = new Editor(this.element, {
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

    static async create(fileID: string, defaultEditorOptions: EditorOptions): Promise<PluginEditor> {

        const instance = new PluginEditor(fileID);

        await instance.genToolbar();
        let syncID = await findSyncIDInProtyle(fileID);

        if(syncID == null) {
            throw new SyncIDNotFoundError(fileID);
        }
        instance.setSyncID(syncID);
        await instance.restoreOrInitFile(defaultEditorOptions);

        return instance;

    }

    async restoreOrInitFile(defaultEditorOptions: EditorOptions) {

        this.drawingFile = new PluginAsset(this.fileID, this.syncID, SVG_MIME);
        await this.drawingFile.loadFromSiYuanFS();
        const drawingContent = this.drawingFile.getContent();

        if(drawingContent != null) {

            await this.editor.loadFromSVG(drawingContent);

            // restore position and zoom
            const svgElem = new DOMParser().parseFromString(drawingContent, SVG_MIME).documentElement;
            const editorViewStr = svgElem.getAttribute('editorView');
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

        // save button
        const saveButton = toolbar.addSaveButton(async () => {
            await this.saveCallback(saveButton);
        });

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

    }

    private async saveCallback(saveButton: BaseWidget) {

        const svgElem = this.editor.toSVG();
        let newSyncID: string;
        const oldSyncID = this.syncID;

        const rect = this.editor.viewport.visibleRect;
        const zoom = this.editor.viewport.getScaleFactor();
        svgElem.setAttribute('editorView', `${rect.x} ${rect.y} ${zoom}`)

        try {
            this.drawingFile.setContent(svgElem.outerHTML);
            await this.drawingFile.save();
            newSyncID = this.drawingFile.getSyncID();
            if(newSyncID != oldSyncID) { // supposed to replace protyle
                const changed = await replaceSyncID(this.fileID, oldSyncID, newSyncID); // try to change protyle
                if(!changed) throw new UnchangedProtyleError();
                await this.drawingFile.removeOld(oldSyncID);
            }
            saveButton.setDisabled(true);
            setTimeout(() => { // @todo improve save button feedback
                saveButton.setDisabled(false);
            }, 500);
        } catch (error) {
            showMessage("Error saving! The current drawing has been copied to your clipboard. You may need to create a new drawing and paste it there.", 0, 'error');
            if(error instanceof UnchangedProtyleError) {
                showMessage("Make sure the image you're trying to edit still exists in your documents.", 0, 'error');
            }
            await navigator.clipboard.writeText(svgElem.outerHTML);
            console.error(error);
            console.log("Couldn't save SVG: ", svgElem.outerHTML)
            return;
        }

        this.syncID = newSyncID;

    }

}

export class EditorManager {

    private editor: PluginEditor
    setEditor(editor: PluginEditor) { this.editor = editor;}

    static async create(fileID: string, p: DrawJSPlugin) {
        let instance = new EditorManager();
        try {
            let editor = await PluginEditor.create(fileID, p.config.options.editorOptions);
            instance.setEditor(editor);
        }catch (error) {
            EditorManager.handleCreationError(error, p);
        }
        return instance;
    }

    static registerTab(p: DrawJSPlugin) {
        p.addTab({
            'type': "whiteboard",
            async init() {
                const fileID = this.data.fileID;
                if (fileID == null) {
                    alert(p.i18n.errNoFileID);
                    return;
                }
                try {
                    const editor = await PluginEditor.create(fileID, p.config.options.editorOptions);
                    this.element.appendChild(editor.getElement());
                }catch (error){
                    EditorManager.handleCreationError(error, p);
                }
            }
        });
    }

    static handleCreationError(error: any, p: DrawJSPlugin) {
        console.error(error);
        let errorTxt = p.i18n.errCreateUnknown;
        if(error instanceof SyncIDNotFoundError) {
            errorTxt = p.i18n.errSyncIDNotFound;
        }
        showMessage(errorTxt, 0, 'error');
    }

    toTab(p: Plugin) {
        openTab({
            app: p.app,
            custom: {
                title: p.i18n.drawing,
                icon: 'iconDraw',
                id: "siyuan-jsdraw-pluginwhiteboard",
                data: {
                    fileID: this.editor.getFileID(),
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