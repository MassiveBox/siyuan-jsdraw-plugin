import {Plugin, Protyle} from 'siyuan';
import {
    getMarkdownBlock,
    loadIcons,
    getMenuHTML,
    findImgSrc,
    imgSrcToFilename} from "@/helper";
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
                const filename = `jsdraw-${window.Lute.NewNodeID()}.svg`;
                protyle.insert(getMarkdownBlock(filename), false, false);
                (await EditorManager.create(filename, this)).open(this);
            }
        }];

        this.eventBus.on("open-menu-image", (e: any) => {
            const imgSrc = findImgSrc(e.detail.element);
            if (!imgSrc) return;
            const filename = imgSrcToFilename(imgSrc);
            if (!filename || !filename.endsWith('.svg')) return;
            e.detail.menu.addItem({
                icon: "iconDraw",
                label: this.i18n.editWhiteboard,
                click: async () => {
                    void this.analytics.sendEvent('edit');
                    (await EditorManager.create(filename, this)).open(this);
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

        const imgSrc = findImgSrc(selectedImg[0] as HTMLElement);
        if(!imgSrc) {
            throw new NotAWhiteboardError();
        }
        const filename = imgSrcToFilename(imgSrc);
        if(!filename || !filename.endsWith('.svg')) {
            throw new NotAWhiteboardError();
        }
        void this.analytics.sendEvent('edit');
        (await EditorManager.create(filename, this)).open(this);

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