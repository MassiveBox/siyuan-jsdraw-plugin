import {Dialog, getFrontend, ITabModel, openTab, Plugin} from "siyuan"
import Editor, {BaseWidget, EditorEventType} from "js-draw";
import { MaterialIconProvider } from '@js-draw/material-icons';
import 'js-draw/styles';
import {getFile, saveFile, uploadAsset} from "@/file";
import {DATA_PATH, JSON_MIME, SVG_MIME, TOOLBAR_PATH} from "@/const";
import {replaceSyncID} from "@/protyle";
import {IDsToAssetPath} from "@/helper";
import {removeFile} from "@/api";

export function openEditorTab(p: Plugin, fileID: string, initialSyncID: string) {
    if(getFrontend() == "mobile") {
        const dialog = new Dialog({
            width: "100vw",
            height: "100vh",
            content: `<div id="DrawingPanel" style="width:100%; height: 100%;"></div>`,
        });
        createEditor(dialog.element.querySelector("#DrawingPanel"), fileID, initialSyncID);
        return;
    }
    for(const tab of p.getOpenedTab()["whiteboard"]) {
        if(tab.data.fileID == fileID) {
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
                fileID: fileID,
                initialSyncID: initialSyncID
            }
        }
    });
}

async function saveCallback(editor: Editor, fileID: string, oldSyncID: string, saveButton: BaseWidget): Promise<string> {

    const svgElem = editor.toSVG();
    let newSyncID;

    try {
        newSyncID = (await uploadAsset(fileID, SVG_MIME, svgElem.outerHTML)).syncID;
        await replaceSyncID(fileID, oldSyncID, newSyncID);
        await removeFile(DATA_PATH + IDsToAssetPath(fileID, oldSyncID));
        saveButton.setDisabled(true);
        setTimeout(() => { // @todo improve save button feedback
            saveButton.setDisabled(false);
        }, 500);
    } catch (error) {
        alert("Error saving drawing! Enter developer mode to find the error, and a copy of the current status.");
        console.error(error);
        console.log("Couldn't save SVG: ", svgElem.outerHTML)
        return oldSyncID;
    }

    return newSyncID

}

export function createEditor(element: HTMLElement, fileID: string, initialSyncID: string) {

    const editor = new Editor(element, {
        iconProvider: new MaterialIconProvider(),
    });

    const toolbar = editor.addToolbar();

    // restore toolbar state
    getFile(TOOLBAR_PATH).then(toolbarState => {
        if(toolbarState!= null) {
            toolbar.deserializeState(toolbarState)
        }
    });
    // restore drawing
    getFile(DATA_PATH +IDsToAssetPath(fileID, initialSyncID)).then(svg => {
        if(svg != null) {
            editor.loadFromSVG(svg);
        }
    });

    let syncID = initialSyncID;
    // save logic
    const saveButton = toolbar.addSaveButton(() => {
        saveCallback(editor, fileID, syncID, saveButton).then(
            newSyncID => {
                syncID = newSyncID
            }
        )
    });

    // save toolbar config on tool change (toolbar state is not saved in SVGs!)
    editor.notifier.on(EditorEventType.ToolUpdated, () => {
        saveFile(TOOLBAR_PATH, JSON_MIME, toolbar.serializeState());
    });

    editor.dispatch(editor.setBackgroundStyle({ autoresize: true }), false);
    editor.getRootElement().style.height = '100%';

}

export function editorTabInit(tab: ITabModel) {

    const fileID = tab.data.fileID;
    const initialSyncID = tab.data.initialSyncID;
    if (fileID == null || initialSyncID == null) {
        alert("File or Sync ID and path missing - couldn't open file.")
        return;
    }
    createEditor(tab.element, fileID, initialSyncID);

}