import {MaterialIconProvider} from "@js-draw/material-icons";
import {PluginAsset, PluginFile} from "@/file";
import {JSON_MIME, STORAGE_PATH, SVG_MIME, TOOLBAR_FILENAME} from "@/const";
import Editor, {BaseWidget, EditorEventType} from "js-draw";
import {Dialog, Plugin, openTab, getFrontend} from "siyuan";
import {replaceSyncID} from "@/protyle";

export class PluginEditor {

    private readonly element: HTMLElement;
    private readonly editor: Editor;

    private drawingFile: PluginAsset;
    private toolbarFile: PluginFile;

    private readonly fileID: string;
    private syncID: string;
    private readonly initialSyncID: string;

    getElement(): HTMLElement { return this.element; }
    getEditor(): Editor { return this.editor; }
    getFileID(): string { return this.fileID; }
    getSyncID(): string { return this.syncID; }
    getInitialSyncID(): string { return this.initialSyncID; }

    constructor(fileID: string, initialSyncID: string) {

        this.element = document.createElement("div");
        this.element.style.height = '100%';
        this.editor = new Editor(this.element, {
            iconProvider: new MaterialIconProvider(),
        });

        this.fileID = fileID;
        this.initialSyncID = initialSyncID;
        this.syncID = initialSyncID;

        this.genToolbar();

        // restore drawing
        this.drawingFile = new PluginAsset(fileID, initialSyncID, SVG_MIME);
        this.drawingFile.loadFromSiYuanFS().then(() => {
            if(this.drawingFile.getContent() != null) {
                this.editor.loadFromSVG(this.drawingFile.getContent());
            }
        });

        this.editor.dispatch(this.editor.setBackgroundStyle({ autoresize: true }), false);
        this.editor.getRootElement().style.height = '100%';

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

    static registerTab(p: Plugin) {
        p.addTab({
            'type': "whiteboard",
            init() {
                const fileID = this.data.fileID;
                const initialSyncID = this.data.initialSyncID;
                if (fileID == null || initialSyncID == null) {
                    alert("File or Sync ID and path missing - couldn't open file.")
                    return;
                }
                const editor = new PluginEditor(fileID, initialSyncID);
                this.element.appendChild(editor.getElement());
            }
        });
    }

    toTab(p: Plugin) {
        for(const tab of p.getOpenedTab()["whiteboard"]) {
            if(tab.data.fileID == this.editor.getFileID()) {
                alert("File is already open in another editor tab!");
                return;
            }
        }
        openTab({
            app: p.app,
            custom: {
                title: 'Drawing',
                icon: 'iconDraw',
                id: "siyuan-jsdraw-pluginwhiteboard",
                data: {
                    fileID: this.editor.getFileID(),
                    initialSyncID: this.editor.getInitialSyncID()
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

    open(p: Plugin) {
        if(getFrontend() != "mobile") {
            this.toTab(p);
        } else {
            this.toDialog();
        }
    }

}