import {Plugin, Protyle} from 'siyuan';
import {
    getPreviewHTML,
    loadIcons,
    getMenuHTML,
    generateSiyuanId,
    findImgSrc,
    imgSrcToPath
} from "@/helper";
import {editorTabInit, openEditorTab} from "@/editorTab";
import {ASSETS_PATH} from "@/const";

export default class DrawJSPlugin extends Plugin {
    onload() {

        loadIcons(this);
        this.addTab({
            'type': "whiteboard",
            init() { editorTabInit(this) }
        });

        this.protyleSlash = [{
            id: "insert-drawing",
            filter: ["Insert Drawing", "Add drawing", "whiteboard", "freehand", "graphics", "jsdraw"],
            html: getMenuHTML("iconDraw", this.i18n.insertDrawing),
            callback: (protyle: Protyle) => {
                const path = ASSETS_PATH + generateSiyuanId() + ".svg";
                protyle.insert(getPreviewHTML(path), true, false);
                openEditorTab(this, path);
            }
        }];

        this.eventBus.on("open-menu-image", (e: any) => {
            const path = imgSrcToPath(findImgSrc(e.detail.element));
            if(path === null) {
                return;
            }
            e.detail.menu.addItem({
                icon: "iconDraw",
                label: "Edit with js-draw",
                click: () => {
                    openEditorTab(this, path);
                }
            })
        })

    }

}