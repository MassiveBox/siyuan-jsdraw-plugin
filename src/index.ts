import {Plugin, Protyle} from 'siyuan';
import {
    getMarkdownBlock,
    loadIcons,
    getMenuHTML,
    findImgSrc,
    imgSrcToIDs, generateTimeString, generateRandomString
} from "@/helper";
import {EditorManager} from "@/editor";
import {PluginConfig, PluginConfigViewer} from "@/config";
import {Analytics} from "@/analytics";
import {ErrorReporter, MustSelectError, NotAWhiteboardError} from "@/errors";

export default class DrawJSPlugin extends Plugin {

    config: PluginConfig;
    analytics: Analytics;

    async onload() {

        new ErrorReporter(this.i18n);
        loadIcons(this);
        EditorManager.registerTab(this);

        await this.startConfig();
        await this.startAnalytics();

        this.protyleSlash = [{
            id: "insert-whiteboard",
            filter: ["Insert Drawing", "Add drawing", "Insert whiteboard", "Add whiteboard", "whiteboard", "freehand", "graphics", "jsdraw", this.i18n.insertWhiteboard],
            html: getMenuHTML("iconDraw", this.i18n.insertWhiteboard),
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
                label: this.i18n.editWhiteboard,
                click: async () => {
                    void this.analytics.sendEvent('edit');
                    (await EditorManager.create(ids.fileID, this)).open(this);
                }
            })
        })

        this.addCommand({
            langKey: "editShortcut",
            hotkey: "⌥⇧D",
            callback: async () => {
                this.editSelectedImg().catch(e => ErrorReporter.error(e, 5000));
            },
        })

        this.addTopBar({
            icon: "iconDraw",
            title: this.i18n.editShortcut,
            callback: async () => {
                await this.editSelectedImg().catch(e => ErrorReporter.error(e, 5000));
            },
            position: "left"
        })

    }

    onunload() {
        void this.analytics.sendEvent("unload");
    }

    uninstall() {
        void this.analytics.sendEvent("uninstall");
    }

    private async editSelectedImg() {

        let selectedImg = document.getElementsByClassName('img--select');
        if(selectedImg.length == 0) {
            throw new MustSelectError();
        }

        let ids = imgSrcToIDs(findImgSrc(selectedImg[0] as HTMLElement));
        if(ids == null) {
            throw new NotAWhiteboardError();
        }
        void this.analytics.sendEvent('edit');
        (await EditorManager.create(ids.fileID, this)).open(this);

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