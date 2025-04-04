import {Dialog, getFrontend, ITabModel, openTab, Plugin} from "siyuan"
import Editor, {BaseWidget, EditorEventType} from "js-draw";
import { MaterialIconProvider } from '@js-draw/material-icons';
import 'js-draw/styles';
import {getFile, saveFile} from "@/file";
import {DATA_PATH, JSON_MIME, SVG_MIME, TOOLBAR_PATH} from "@/const";
import {replaceAntiCacheID} from "@/protyle";
import {idToPath} from "@/helper";

export function openEditorTab(p: Plugin, path: string) {
    if(getFrontend() == "mobile") {
        const dialog = new Dialog({
            width: "100vw",
            height: "100vh",
            content: `<div id="DrawingPanel" style="width:100%; height: 100%;"></div>`,
        });
        createEditor(dialog.element.querySelector("#DrawingPanel"), path);
        return;
    }
    openTab({
        app: p.app,
        custom: {
            title: 'Drawing',
            icon: 'iconDraw',
            id: "siyuan-jsdraw-pluginwhiteboard",
            data: { path: path }
        }
    });
}

async function saveCallback(editor: Editor, path: string, saveButton: BaseWidget) {
    const svgElem = editor.toSVG();
    try {
        saveFile(DATA_PATH + path, SVG_MIME, svgElem.outerHTML);
        await replaceAntiCacheID(path);
        saveButton.setDisabled(true);
        setTimeout(() => { // @todo improve save button feedback
            saveButton.setDisabled(false);
        }, 500);
    } catch (error) {
        alert("Error saving drawing! Enter developer mode to find the error, and a copy of the current status.");
        console.error(error);
        console.log("Couldn't save SVG: ", svgElem.outerHTML)
    }

}

export function createEditor(element: HTMLElement, path: string) {

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
    getFile(DATA_PATH + path).then(svg => {
        if(svg != null) {
            editor.loadFromSVG(svg);
        }
    });

    // save logic
    const saveButton = toolbar.addSaveButton(() => saveCallback(editor, path, saveButton));

    // save toolbar config on tool change (toolbar state is not saved in SVGs!)
    editor.notifier.on(EditorEventType.ToolUpdated, () => {
        saveFile(TOOLBAR_PATH, JSON_MIME, toolbar.serializeState());
    });

    editor.dispatch(editor.setBackgroundStyle({ autoresize: true }), false);
    editor.getRootElement().style.height = '100%';

}

export function editorTabInit(tab: ITabModel) {

    let path = tab.data.path;
    if(path == null) {
        const fileID = tab.data.id; // legacy compatibility
        if (fileID == null) {
            alert("File ID and path missing - couldn't open file.")
            return;
        }
        path = idToPath(fileID);
    }
    createEditor(tab.element, path);

}