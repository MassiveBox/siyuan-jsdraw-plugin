import {Plugin, Protyle} from 'siyuan';
import {
    getMarkdownBlock,
    loadIcons,
    getMenuHTML,
    findImgSrc,
    imgSrcToFilename} from "@/helper";
import {EditorManager, PluginEditor} from "@/editor";
import {PluginConfig, PluginConfigViewer} from "@/config";
import {Analytics} from "@/analytics";
import {ErrorReporter, MustSelectError, NotAWhiteboardError, UninitializedProtyleError} from "@/errors";
import { sql } from './api';
import { confirmDialog } from '@/libs/dialog';
import { setupRefreshListener, teardownRefreshListener } from '@/refresh';

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

        this.eventBus.on("switch-protyle", (e: any) => {
            this.lastActiveProtyle = e.detail.protyle.getInstance();
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
                for (const editor of PluginEditor.getOpenEditors()) {
                    if (editor.getIsDirty()) {
                        editor.autosave().catch(() => {});
                    }
                }
            }
        })

        this.addCommand({
            langKey: "editShortcut",
            hotkey: "⌥⇧D",
            callback: async () => {
                this.shortcutEditSelectedOrCreate(this.lastActiveProtyle).catch(e => ErrorReporter.error(e, 5000));
            },
        })

        this.addTopBar({
            icon: "iconDraw",
            title: this.i18n.editShortcut,
            callback: async () => {
                await this.shortcutEditSelectedOrCreate(this.lastActiveProtyle || undefined)
                    .catch(e => ErrorReporter.error(e, 5000));
            },
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

    private async shortcutEditSelectedOrCreate(protyle?: Protyle) {

        let selectedImg = document.getElementsByClassName('img--select');
        if(selectedImg.length == 0) { // create image
            if (!protyle) {
                throw new UninitializedProtyleError();
            }
            const action = this.config.options.noSelectionAction;
            if (action === 'nothing') throw new MustSelectError();
            return this.shortcutCreate(protyle, action === 'ask');
        }

        const imgSrc = findImgSrc(selectedImg[0] as HTMLElement);
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