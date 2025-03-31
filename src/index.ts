import {Plugin, Protyle} from 'siyuan';
import {getPreviewHTML, loadIcons, getMenuHTML, generateSiyuanId} from "@/helper";
import {createEditor, openEditorTab} from "@/editorTab";

export default class DrawJSPlugin extends Plugin {
    onload() {

        loadIcons(this);
        //const id = Math.random().toString(36).substring(7);
        this.addTab({
            'type': "whiteboard",
            init() {
                createEditor(this);
            }
        });

        this.protyleSlash = [{
            id: "insert-drawing",
            filter: ["Insert Drawing", "Add drawing", "whiteboard", "freehand", "graphics", "jsdraw"],
            html: getMenuHTML("iconDraw", this.i18n.insertDrawing),
            callback: (protyle: Protyle) => {
                const uid = generateSiyuanId();
                protyle.insert(getPreviewHTML(uid), true, false);
                openEditorTab(this, uid);
            }
        }];

    }

    onLayoutReady() {
        // This function is automatically called when the layout is loaded.
    }

    onunload() {
        // This function is automatically called when the plugin is disabled.
    }

    uninstall() {
        // This function is automatically called when the plugin is uninstalled.
    }



}