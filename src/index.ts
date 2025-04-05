import {Plugin, Protyle} from 'siyuan';
import {
    getMarkdownBlock,
    loadIcons,
    getMenuHTML,
    findImgSrc,
    imgSrcToIDs, generateTimeString, generateRandomString
} from "@/helper";
import {editorTabInit, openEditorTab} from "@/editorTab";

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
                const fileID = generateRandomString();
                const syncID = generateTimeString() + '-' + generateRandomString();
                protyle.insert(getMarkdownBlock(fileID, syncID), true, false);
                openEditorTab(this, fileID, syncID);
            }
        }];

        this.eventBus.on("open-menu-image", (e: any) => {
            const ids = imgSrcToIDs(findImgSrc(e.detail.element));
            if(ids === null) return;
            e.detail.menu.addItem({
                icon: "iconDraw",
                label: "Edit with js-draw",
                click: () => {
                    openEditorTab(this, ids.fileID, ids.syncID);
                }
            })
        })

    }

}