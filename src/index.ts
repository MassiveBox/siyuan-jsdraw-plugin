import {getFrontend, Plugin, Protyle} from 'siyuan';
import {
    getMarkdownBlock,
    loadIcons,
    getMenuHTML,
    findImgSrc,
    imgSrcToFilename} from "@/helper";
import {EditorManager} from "@/editor";
import {PluginConfig, PluginConfigViewer} from "@/config";
import {Analytics} from "@/analytics";
import {ErrorReporter, MustSelectError, NotAWhiteboardError, MustOpenDocumentError} from "@/errors";
import { confirmDialog } from '@/libs/dialog';
import { setupRefreshListener, teardownRefreshListener, refreshAllSVGImages } from '@/refresh';
import { updateImageColorInversionStyle } from '@/theme';

export default class DrawJSPlugin extends Plugin {

    config: PluginConfig;
    analytics: Analytics;
    private lastActiveProtyle: Protyle | null = null;

    async onload() {

        new ErrorReporter(this.i18n);
        loadIcons(this);
        EditorManager.registerTab(this);
        setupRefreshListener();

        await this.startConfig();
        await this.startAnalytics();

        // keep track of last active protyle, for edit/create shortcut
        this.eventBus.on("switch-protyle", (e: any) => {
            this.lastActiveProtyle = e.detail.protyle.getInstance();
        });
        this.eventBus.on("destroy-protyle", (e: any) => {
            const destroyedProtyle = e.detail.protyle.getInstance();
            if (this.lastActiveProtyle === destroyedProtyle) {
                this.lastActiveProtyle = null;
            }
        });

        this.protyleSlash = [{
            id: "insert-whiteboard",
            filter: ["Insert Drawing", "Add drawing", "Insert whiteboard", "Add whiteboard", "whiteboard", "freehand", "graphics", "jsdraw", this.i18n.insertWhiteboard],
            html: getMenuHTML("iconDraw", this.i18n.insertWhiteboard),
            callback: async (protyle: Protyle) => {
                void this.analytics.sendEvent('create', {'from': 'slash'});
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
                    void this.analytics.sendEvent('edit', {'from': 'menu'});
                    (await EditorManager.create(filename, this)).open(this);
                }
            })
        })

        this.eventBus.on("ws-main", (e: any) => {
            if (e.detail?.cmd === "exit") {
                for (const editor of EditorManager.getOpenEditors()) {
                    if (editor.getIsDirty()) {
                        editor.autosave().catch(() => {});
                    }
                }
            }
            if (e.detail?.cmd === "reloadPlugin") {
                const dataChangePlugins: string[] = e.detail?.data?.dataChangePlugins ?? [];
                if (dataChangePlugins.includes("siyuan-jsdraw-plugin")) {
                    if (EditorManager.getOpenEditors().size > 0) {
                        window.location.reload();
                    } else {
                        refreshAllSVGImages();
                    }
                }
            }
        })

        this.addCommand({
            langKey: "editShortcut",
            hotkey: "⌥⇧D",
            callback: () => void this.handleEditShortcut(),
        })

        this.addTopBar({
            icon: "iconDraw",
            title: this.i18n.editShortcut,
            callback: () => void this.handleEditShortcut(),
            position: "left"
        })

    }

    onunload() {
        teardownRefreshListener();
        void this.analytics.sendEvent("unload");
    }

    uninstall() {
        void this.analytics.sendEvent("uninstall");
    }

    private async handleEditShortcut() {
        await this.shortcutEditSelectedOrCreate(this.lastActiveProtyle)
            .catch(e => ErrorReporter.error(e, 5000));
    }

    private isProtyleActive(protyle?: Protyle): boolean {
        if (!protyle) return false;
        const protyleElement = (protyle as any).protyle?.element;
        if (!protyleElement) return false;
        if (!protyleElement.isConnected) return false;
        if(getFrontend() != 'mobile' && getFrontend() != 'browser-mobile') {
            // good indicator of whether the protyle is active from SiYuan source code
            // https://github.com/siyuan-note/siyuan/blob/e1482b41418a777626c980157c8bb0a273a021eb/app/src/editor/util.ts#L561
            if (protyleElement.closest(".fn__none")) return false;
            const activeWnd = document.querySelector(".layout__wnd--active");
            if (activeWnd && !activeWnd.contains(protyleElement)) return false;
        }
        if (document.querySelector("#DrawingPanel")) return false; // editor dialog is open
        if (!(protyle as any).protyle?.toolbar?.range) return false;
        return true;
    }

    private async shortcutEditSelectedOrCreate(protyle?: Protyle) {

        let selectedImg = document.getElementsByClassName('img--select');
        if(selectedImg.length == 0) { // create image
            if (!this.isProtyleActive(protyle)) {
                throw new MustOpenDocumentError();
            }
            const action = this.config.options.noSelectionAction;
            if (action === 'nothing') throw new MustSelectError();
            return this.shortcutCreate(protyle, action === 'ask');
        }

        const selectedImgEl = selectedImg[0] as HTMLElement;
        selectedImgEl.classList.remove("img--select");
        const imgSrc = findImgSrc(selectedImgEl);
        if(!imgSrc) {
            throw new NotAWhiteboardError();
        }
        const filename = imgSrcToFilename(imgSrc);
        if(!filename || !filename.endsWith('.svg')) {
            throw new NotAWhiteboardError();
        }
        void this.analytics.sendEvent('edit', {'from': 'shortcut'});
        (await EditorManager.create(filename, this)).open(this);

    }

    private async shortcutCreate(protyle: Protyle, askFirst: boolean = true) {
        if (askFirst) {
            const confirmed = await new Promise<boolean>((resolve) => {
                confirmDialog({
                    title: this.i18n.createConfirm.title,
                    content: this.i18n.createConfirm.message,
                    confirm: () => resolve(true),
                    cancel: () => resolve(false),
                });
            });
            if (!confirmed) return;
        }

        const filename = `jsdraw-${window.Lute.NewNodeID()}.svg`;
        protyle.insert(getMarkdownBlock(filename), false, true);
        void this.analytics.sendEvent('create', {'from': 'shortcut'});
        (await EditorManager.create(filename, this)).open(this);
        return;
    }

    private async startConfig() {
        this.config = new PluginConfig();
        await this.config.load();
        let configViewer = new PluginConfigViewer(this.config, this);
        await configViewer.load();
        updateImageColorInversionStyle(this.config.options.imageColorInversion);
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