import {PluginFile} from "@/file";
import {CONFIG_FILENAME, JSON_MIME, STORAGE_PATH} from "@/const";
import {Plugin} from "siyuan";
import {SettingUtils} from "@/libs/setting-utils";
import {getFirstDefined} from "@/helper";
import {ErrorReporter, InvalidBackgroundColorError} from "@/errors";
import { updateImageColorInversionStyle } from '@/theme';

const DEFAULT_ADDITIONAL_PENS = 2;
const MAX_ADDITIONAL_PENS = 7;

export interface Options {
    dialogOnDesktop: boolean
    analytics: boolean
    noSelectionAction: 'ask' | 'create' | 'nothing'
    editorOptions: EditorOptions
    imageColorInversion: 'on-dark' | 'on-light' | 'disabled'
}
export interface EditorOptions {
    restorePosition: boolean;
    grid: boolean
    background: string
    additionalPens: number
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
            noSelectionAction: getFirstDefined(jsonObj?.noSelectionAction, 'ask'),
            editorOptions: {
                restorePosition: getFirstDefined(jsonObj?.editorOptions?.restorePosition, jsonObj?.restorePosition,  true),
                grid: getFirstDefined(jsonObj?.editorOptions?.grid, jsonObj?.grid, true),
                background: getFirstDefined(jsonObj?.editorOptions?.background, jsonObj?.background, "#00000000"),
                additionalPens: getFirstDefined(jsonObj?.editorOptions?.additionalPens, DEFAULT_ADDITIONAL_PENS)
            },
            imageColorInversion: getFirstDefined(jsonObj?.imageColorInversion, 'disabled'),
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

    private buildOptionsFromData(data: any): { options: Options, color: string } {
        const color = data.backgroundDropdown === "CUSTOM" ? data.background : data.backgroundDropdown;
        const parsedAdditionalPens = parseInt(data.additionalPens);
        return {
            options: {
                dialogOnDesktop: !!data.dialogOnDesktop,
                analytics: !!data.analytics,
                noSelectionAction: data.noSelectionAction || 'ask',
                editorOptions: {
                    grid: !!data.grid,
                    background: PluginConfig.validateColor(color)
                        ? color
                        : this.config.options.editorOptions.background,
                    restorePosition: !!data.restorePosition,
                    additionalPens: Math.max(0, Math.min(MAX_ADDITIONAL_PENS, isNaN(parsedAdditionalPens) ? DEFAULT_ADDITIONAL_PENS : parsedAdditionalPens))
                },
                imageColorInversion: data.imageColorInversion || 'disabled',
            },
            color
        };
    }

    async configSaveCallback(data) {
        const { options, color } = this.buildOptionsFromData(data);
        if (!PluginConfig.validateColor(color)) {
            ErrorReporter.error(new InvalidBackgroundColorError());
            data.background = this.config.options.editorOptions.background;
            this.settingUtils.set('background', data.background);
            options.editorOptions.background = data.background;
        }
        this.config.setConfig(options);
        await this.config.save();
        updateImageColorInversionStyle(options.imageColorInversion);
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
            key: "additionalPens",
            title: this.plugin.i18n.settings.additionalPens.title,
            description: this.plugin.i18n.settings.additionalPens.description,
            value: this.config.options.editorOptions.additionalPens,
            type: 'slider',
            slider: { min: 0, max: MAX_ADDITIONAL_PENS, step: 1 }
        });

        this.settingUtils.addItem({
            key: "dialogOnDesktop",
            title: this.plugin.i18n.settings.dialogOnDesktop.title,
            description: this.plugin.i18n.settings.dialogOnDesktop.description,
            value: this.config.options.dialogOnDesktop,
            type: 'checkbox'
        });

        this.settingUtils.addItem({
            key: "noSelectionAction",
            title: this.plugin.i18n.settings.noSelectionAction.title,
            description: this.plugin.i18n.settings.noSelectionAction.description,
            type: 'select',
            value: this.config.options.noSelectionAction,
            options: {
                'ask': this.plugin.i18n.settings.noSelectionAction.options.ask,
                'create': this.plugin.i18n.settings.noSelectionAction.options.create,
                'nothing': this.plugin.i18n.settings.noSelectionAction.options.nothing,
            },
            action: {
                callback: () => {
                    this.config.options.noSelectionAction = this.settingUtils.take('noSelectionAction', true) as Options['noSelectionAction'];
                }
            },
        });

        this.settingUtils.addItem({
            key: "imageColorInversion",
            title: this.plugin.i18n.settings.imageColorInversion.title,
            description: this.plugin.i18n.settings.imageColorInversion.description,
            type: 'select',
            value: this.config.options.imageColorInversion,
            options: {
                'on-dark': this.plugin.i18n.settings.imageColorInversion.options.onDark,
                'on-light': this.plugin.i18n.settings.imageColorInversion.options.onLight,
                'disabled': this.plugin.i18n.settings.imageColorInversion.options.disabled,
            },
        });

        this.settingUtils.addItem({
            key: "analytics",
            title: this.plugin.i18n.settings.analytics.title,
            description: this.plugin.i18n.settings.analytics.description,
            value: this.config.options.analytics,
            type: 'checkbox'
        });

    }

    async load() {
        const data = await this.settingUtils.load();
        const { options } = this.buildOptionsFromData(data);
        this.config.setConfig(options);
        return data;
    }

}