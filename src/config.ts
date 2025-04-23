import {PluginFile} from "@/file";
import {CONFIG_FILENAME, JSON_MIME, STORAGE_PATH} from "@/const";
import {Plugin, showMessage} from "siyuan";
import {SettingUtils} from "@/libs/setting-utils";
import {validateColor} from "@/helper";

type Options = {
    grid: boolean
    background: string
    dialogOnDesktop: boolean
    analytics: boolean
};

export type DefaultEditorOptions = {
    grid: boolean
    background: string
}

export class PluginConfig {

    private file: PluginFile;

    options: Options;
    private firstRun: boolean;

    getFirstRun() { return this.firstRun }

    constructor() {
        this.file = new PluginFile(STORAGE_PATH, CONFIG_FILENAME, JSON_MIME);
    }

    getDefaultEditorOptions(): DefaultEditorOptions {
        return {
            grid: this.options.grid,
            background: this.options.background,
        };
    }

    async load() {
        this.firstRun = false;
        await this.file.loadFromSiYuanFS();
        this.options = JSON.parse(this.file.getContent());
        if(this.options == null) {
            this.loadDefaultConfig();
        }
    }

    private loadDefaultConfig() {
        this.options = {
            grid: true,
            background: "#000000",
            dialogOnDesktop: false,
            analytics: true,
        };
        this.firstRun = true;
    }

    async save() {
        this.file.setContent(JSON.stringify(this.options));
        await this.file.save();
    }

    setConfig(config: Options) {

        this.options = config;
    }

}

export class PluginConfigViewer {

    config: PluginConfig;
    settingUtils: SettingUtils;
    plugin: Plugin;

    constructor(config: PluginConfig, plugin: Plugin) {
        this.config = config;
        this.plugin = plugin;
        this.populateSettingMenu();
    }

    async configSaveCallback(data) {

        if(!validateColor(data.background)) {
            showMessage(this.plugin.i18n.errInvalidBackgroundColor, 0, 'error');
            data.background = this.config.options.background;
            this.settingUtils.set('background', data.background);
        }
        this.config.setConfig({
            grid: data.grid,
            background: data.background,
            dialogOnDesktop: data.dialogOnDesktop,
            analytics: data.analytics,
        });
        await this.config.save();

    }

    populateSettingMenu() {

        this.settingUtils = new SettingUtils({
            plugin: this.plugin,
            name: this.plugin.i18n.settings.name,
            callback: async (data) => {
                await this.configSaveCallback(data);
            }
        });

        this.settingUtils.addItem({
            key: "grid",
            title: this.plugin.i18n.settings.grid.title,
            description: this.plugin.i18n.settings.grid.description,
            value: this.config.options.grid,
            type: 'checkbox'
        });

        this.settingUtils.addItem({
            key: "background",
            title: this.plugin.i18n.settings.background.title,
            description: this.plugin.i18n.settings.background.description,
            value: this.config.options.background,
            type: 'textarea',
        });

        this.settingUtils.addItem({
            key: "dialogOnDesktop",
            title: this.plugin.i18n.settings.dialogOnDesktop.title,
            description: this.plugin.i18n.settings.dialogOnDesktop.description,
            value: this.config.options.dialogOnDesktop,
            type: 'checkbox'
        });

        this.settingUtils.addItem({
            key: "analytics",
            title: this.plugin.i18n.settings.analytics.title,
            description: this.plugin.i18n.settings.analytics.description,
            value: this.config.options.analytics,
            type: 'checkbox'
        });

    }

    load() {
        return this.settingUtils.load();
    }

}