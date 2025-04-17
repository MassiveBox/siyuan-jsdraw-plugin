import {MaterialIconProvider} from "@js-draw/material-icons";
import {PluginAsset, PluginFile} from "@/file";
import {JSON_MIME, STORAGE_PATH, SVG_MIME, TOOLBAR_FILENAME} from "@/const";
import Editor, {BackgroundComponentBackgroundType, BaseWidget, Color4, EditorEventType} from "js-draw";
import {Dialog, getFrontend, openTab, Plugin} from "siyuan";
import {findSyncIDInProtyle, replaceSyncID} from "@/protyle";
import DrawJSPlugin from "@/index";
import {DefaultEditorOptions} from "@/config";

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

    constructor(fileID: string, defaultEditorOptions: DefaultEditorOptions) {

        this.fileID = fileID;

        this.element = document.createElement("div");
        this.element.style.height = '100%';
        this.editor = new Editor(this.element, {
            iconProvider: new MaterialIconProvider(),
        });

        this.genToolbar().then(() => {
            this.editor.dispatch(this.editor.setBackgroundStyle({ autoresize: true }), false);
            this.editor.getRootElement().style.height = '100%';
        });

        findSyncIDInProtyle(this.fileID).then(async (syncID) => {
            this.syncID = syncID;
            // restore drawing
            this.drawingFile = new PluginAsset(this.fileID, syncID, SVG_MIME);
            await this.drawingFile.loadFromSiYuanFS();
            if(this.drawingFile.getContent() != null) {
                await this.editor.loadFromSVG(this.drawingFile.getContent());
            }else{
                // it's a new drawing
                this.editor.dispatch(this.editor.setBackgroundStyle({
                    color: Color4.fromHex(defaultEditorOptions.background),
                    type: defaultEditorOptions.grid ? BackgroundComponentBackgroundType.Grid : BackgroundComponentBackgroundType.SolidColor,
                    autoresize: true
                }));
            }
        });

    }

    private async genToolbar() {

        const toolbar = this.editor.addToolbar();

        // restore toolbarFile state
        this.toolbarFile = new PluginFile(STORAGE_PATH, TOOLBAR_FILENAME, JSON_MIME);
        this.toolbarFile.loadFromSiYuanFS().then(() => {
            if(this.toolbarFile.getContent() != null) {
                toolbar.deserializeState(this.toolbarFile.getContent());
            }
        });

        // save button
        const saveButton = toolbar.addSaveButton(async () => {
            await this.saveCallback(saveButton);
        });

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

        try {
            this.drawingFile.setContent(svgElem.outerHTML);
            await this.drawingFile.save();
            newSyncID = this.drawingFile.getSyncID();
            if(newSyncID != oldSyncID) { // supposed to replace protyle
                const changed = await replaceSyncID(this.fileID, oldSyncID, newSyncID); // try to change protyle
                if(!changed) {
                    alert(
                        "Error replacing old sync ID with new one! You may need to manually replace the file path." +
                        "\nTry saving the drawing again. This is a bug, please open an issue as soon as you can." +
                        "\nIf your document doesn't show the drawing, you can recover it from the SiYuan workspace directory."
                    );
                    return; // don't delete old drawing if protyle unchanged (could cause confusion)
                }
                await this.drawingFile.removeOld(oldSyncID);
            }
            saveButton.setDisabled(true);
            setTimeout(() => { // @todo improve save button feedback
                saveButton.setDisabled(false);
            }, 500);
        } catch (error) {
            alert("Error saving drawing! Enter developer mode to find the error, and a copy of the current status.");
            console.error(error);
            console.log("Couldn't save SVG: ", svgElem.outerHTML)
            return;
        }

        this.syncID = newSyncID;

    }

}

export class EditorManager {

    private editor: PluginEditor

    constructor(editor: PluginEditor) {
        this.editor = editor;
    }

    static registerTab(p: DrawJSPlugin) {
        p.addTab({
            'type': "whiteboard",
            init() {
                const fileID = this.data.fileID;
                if (fileID == null) {
                    alert("File ID missing - couldn't open file.")
                    return;
                }
                const editor = new PluginEditor(fileID, p.config.getDefaultEditorOptions());
                this.element.appendChild(editor.getElement());
            }
        });
    }

    toTab(p: Plugin) {
        openTab({
            app: p.app,
            custom: {
                title: 'Drawing',
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
            height: "100vh",
            content: `<div id="DrawingPanel" style="width:100%; height: 100%;"></div>`,
        });
        dialog.element.querySelector("#DrawingPanel").appendChild(this.editor.getElement());
    }

    async open(p: DrawJSPlugin) {
        if(getFrontend() != "mobile" && !p.config.options.dialogOnDesktop) {
            this.toTab(p);
        } else {
            this.toDialog();
        }
    }

}