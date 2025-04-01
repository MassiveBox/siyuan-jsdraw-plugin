import {Plugin, Protyle} from 'siyuan';
import {getPreviewHTML, loadIcons, getMenuHTML, generateSiyuanId, findImgSrc, extractFileID} from "@/helper";
import {createEditor, openEditorTab} from "@/editorTab";

export default class DrawJSPlugin extends Plugin {
    onload() {

        loadIcons(this);
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

        this.eventBus.on("open-menu-image", (e: any) => {
            const fileID = extractFileID(findImgSrc(e.detail.element));
            if(fileID === null) {
                return;
            }
            console.log("got ID" + fileID);
            e.detail.menu.addItem({
                icon: "iconDraw",
                label: "Edit with js-draw",
                click: () => {
                    openEditorTab(this, fileID);
                }
            })
        })

    }

}