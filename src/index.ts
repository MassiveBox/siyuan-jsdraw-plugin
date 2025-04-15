import {Plugin, Protyle} from 'siyuan';
import {
    getMarkdownBlock,
    loadIcons,
    getMenuHTML,
    findImgSrc,
    imgSrcToIDs, generateTimeString, generateRandomString
} from "@/helper";
import {migrate} from "@/migration";
import {EditorManager, PluginEditor} from "@/editor";
import {PluginConfig, PluginConfigViewer} from "@/config";

export default class DrawJSPlugin extends Plugin {

    config: PluginConfig;

    async onload() {

        loadIcons(this);
        EditorManager.registerTab(this);
        migrate()

        this.config = new PluginConfig();
        await this.config.load();
        let configViewer = new PluginConfigViewer(this.config, this);
        await configViewer.load();

        this.protyleSlash = [{
            id: "insert-drawing",
            filter: ["Insert Drawing", "Add drawing", "whiteboard", "freehand", "graphics", "jsdraw"],
            html: getMenuHTML("iconDraw", this.i18n.insertDrawing),
            callback: (protyle: Protyle) => {
                const fileID = generateRandomString();
                const syncID = generateTimeString() + '-' + generateRandomString();
                protyle.insert(getMarkdownBlock(fileID, syncID), true, false);
                new EditorManager(new PluginEditor(fileID, syncID)).open(this)
            }
        }];

        this.eventBus.on("open-menu-image", (e: any) => {
            const ids = imgSrcToIDs(findImgSrc(e.detail.element));
            if (ids === null) return;
            e.detail.menu.addItem({
                icon: "iconDraw",
                label: "Edit with js-draw",
                click: () => {
                    new EditorManager(new PluginEditor(ids.fileID, ids.syncID)).open(this)
                }
            })
        })

    }

}