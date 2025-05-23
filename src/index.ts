import {Plugin, Protyle} from 'siyuan';
import {
    getMarkdownBlock,
    loadIcons,
    getMenuHTML,
    findImgSrc,
    imgSrcToIDs, generateTimeString, generateRandomString
} from "@/helper";
import {migrate} from "@/migration";
import {EditorManager} from "@/editor";
import {PluginConfig, PluginConfigViewer} from "@/config";
import {Analytics} from "@/analytics";

export default class DrawJSPlugin extends Plugin {

    config: PluginConfig;
    analytics: Analytics;

    async onload() {

        loadIcons(this);
        EditorManager.registerTab(this);
        migrate()

        await this.startConfig();
        await this.startAnalytics();

        this.protyleSlash = [{
            id: "insert-drawing",
            filter: ["Insert Drawing", "Add drawing", "whiteboard", "freehand", "graphics", "jsdraw"],
            html: getMenuHTML("iconDraw", this.i18n.insertDrawing),
            callback: async (protyle: Protyle) => {
                void this.analytics.sendEvent('create');
                const fileID = generateRandomString();
                const syncID = generateTimeString() + '-' + generateRandomString();
                protyle.insert(getMarkdownBlock(fileID, syncID), true, false);
                (await EditorManager.create(fileID, this)).open(this);
            }
        }];

        this.eventBus.on("open-menu-image", (e: any) => {
            const ids = imgSrcToIDs(findImgSrc(e.detail.element));
            if (ids === null) return;
            e.detail.menu.addItem({
                icon: "iconDraw",
                label: this.i18n.editDrawing,
                click: async () => {
                    void this.analytics.sendEvent('edit');
                    (await EditorManager.create(ids.fileID, this)).open(this);
                }
            })
        })

    }

    onunload() {
        void this.analytics.sendEvent("unload");
    }

    uninstall() {
        void this.analytics.sendEvent("uninstall");
    }

    private async startConfig() {
        this.config = new PluginConfig();
        await this.config.load();
        let configViewer = new PluginConfigViewer(this.config, this);
        await configViewer.load();
    }

    private async startAnalytics() {
        this.analytics = new Analytics(this.config.options.analytics);
        if(this.config.getFirstRun()) {
            await this.config.save();
            void this.analytics.sendEvent('install');
        }else{
            void this.analytics.sendEvent('load');
        }
    }


}