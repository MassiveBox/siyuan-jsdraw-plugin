import {PluginFile} from "@/file";
import {CONFIG_FILENAME, JSON_MIME, STORAGE_PATH} from "@/const";
import {Plugin, showMessage} from "siyuan";
import {SettingUtils} from "@/libs/setting-utils";
import {getFirstDefined} from "@/helper";

export interface Options {
    dialogOnDesktop: boolean
    analytics: boolean
    editorOptions: EditorOptions
}
export interface EditorOptions {
    restorePosition: boolean;
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

    async load() {
        this.firstRun = false;
        await this.file.loadFromSiYuanFS();
        const jsonObj = JSON.parse(this.file.getContent());
        if(jsonObj == null) {
            this.firstRun = true;
        }
        // if more than one fallback, the intermediate ones are from a legacy config file version
        this.options = {
            dialogOnDesktop: getFirstDefined(jsonObj?.dialogOnDesktop, false),
            analytics: getFirstDefined(jsonObj?.analytics, true),
            editorOptions: {
                restorePosition: getFirstDefined(jsonObj?.editorOptions?.restorePosition, jsonObj?.restorePosition,  true),
                grid: getFirstDefined(jsonObj?.editorOptions?.grid, jsonObj?.grid, true),
                background: getFirstDefined(jsonObj?.editorOptions?.background, jsonObj?.background, "#00000000")
            },
        };
    }

    async save() {
        this.file.setContent(JSON.stringify(this.options));
        await this.file.save();
    }

    setConfig(config: Options) {
        this.options = config;
    }

    static validateColor(hex: string) {
        hex = hex.replace('#', '');
        return typeof hex === 'string'
            && (hex.length === 6 || hex.length === 8)
            && !isNaN(Number('0x' + hex))
    }

}

export class PluginConfigViewer {

    config: PluginConfig;
    settingUtils: SettingUtils;
    plugin: Plugin;
    private readonly backgroundDropdownOptions;

    constructor(config: PluginConfig, plugin: Plugin) {
        this.config = config;
        this.plugin = plugin;
        this.backgroundDropdownOptions = {
            '#00000000': plugin.i18n.settings.suggestedColors.transparent,
            'CUSTOM': plugin.i18n.settings.suggestedColors.custom,
            '#ffffff': plugin.i18n.settings.suggestedColors.white,
            '#1e2227': plugin.i18n.settings.suggestedColors.darkBlue,
            '#1e1e1e': plugin.i18n.settings.suggestedColors.darkGray,
            '#000000': plugin.i18n.settings.suggestedColors.black,
        }
        this.populateSettingMenu();
    }

    async configSaveCallback(data) {

        let color = data.backgroundDropdown === "CUSTOM" ? data.background : data.backgroundDropdown;
        if(!PluginConfig.validateColor(color)) {
            showMessage(this.plugin.i18n.errInvalidBackgroundColor, 0, 'error');
            data.background = this.config.options.editorOptions.background;
            this.settingUtils.set('background', data.background);
        }

        this.config.setConfig({
            dialogOnDesktop: data.dialogOnDesktop,
            analytics: data.analytics,
            editorOptions: {
                grid: data.grid,
                background: color,
                restorePosition: data.restorePosition,
            }
        });
        await this.config.save();

    }

    populateSettingMenu() {

        this.settingUtils = new SettingUtils({
            plugin: this.plugin,
            name: 'optionsUI',
            callback: async (data) => {
                await this.configSaveCallback(data);
            }
        });

        this.settingUtils.addItem({
            key: "grid",
            title: this.plugin.i18n.settings.grid.title,
            description: this.plugin.i18n.settings.grid.description,
            value: this.config.options.editorOptions.grid,
            type: 'checkbox'
        });

        this.settingUtils.addItem({
            key: 'backgroundDropdown',
            title: this.plugin.i18n.settings.backgroundDropdown.title,
            description: this.plugin.i18n.settings.backgroundDropdown.description,
            type: 'select',
            value:  this.config.options.editorOptions.background in this.backgroundDropdownOptions ?
                this.config.options.editorOptions.background : 'CUSTOM',
            options: this.backgroundDropdownOptions,
        });

        this.settingUtils.addItem({
            key: "background",
            title: this.plugin.i18n.settings.background.title,
            description: this.plugin.i18n.settings.background.description,
            value: this.config.options.editorOptions.background,
            type: 'textinput',
        });

        this.settingUtils.addItem({
            key: "restorePosition",
            title: this.plugin.i18n.settings.restorePosition.title,
            description: this.plugin.i18n.settings.restorePosition.description,
            value: this.config.options.editorOptions.restorePosition,
            type: 'checkbox'
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