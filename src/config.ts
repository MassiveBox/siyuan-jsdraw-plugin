import {PluginFile} from "@/file";
import {CONFIG_FILENAME, JSON_MIME, STORAGE_PATH} from "@/const";
import {Plugin} from "siyuan";
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
        if(!validateColor(config.background)) {
            alert("Invalid background color! Please enter an HEX color, like #000000 (black) or #FFFFFF (white)");
            config.background = this.options.background;
        }

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

    populateSettingMenu() {

        this.settingUtils = new SettingUtils({
            plugin: this.plugin,
            callback: async (data) => {
                this.config.setConfig({
                    grid: data.grid,
                    background: data.background,
                    dialogOnDesktop: data.dialogOnDesktop,
                    analytics: data.analytics,
                });
                await this.config.save();
            }
        });

        this.settingUtils.addItem({
            key: "grid",
            title: "Enable grid by default",
            description: "Enable to automatically turn on the grid on new drawings.",
            value: this.config.options.grid,
            type: 'checkbox'
        });

        this.settingUtils.addItem({
            key: "background",
            title: "Default background Color",
            description: "Default background color of the drawing area for new drawings in hexadecimal.",
            value: this.config.options.background,
            type: 'textarea',
        });

        this.settingUtils.addItem({
            key: "dialogOnDesktop",
            title: "Open editor as dialog on desktop",
            description: `
                Dialog mode provides a larger drawing area, but it's not as handy to use as tabs (default).<br />
                The editor will always open as a dialog on mobile.
            `,
            value: this.config.options.dialogOnDesktop,
            type: 'checkbox'
        });

        this.settingUtils.addItem({
            key: "analytics",
            title: "Analytics",
            description: `
                Enable to send anonymous usage data to the developer.
                <a href='https://s.massive.box/jsdraw-plugin-privacy'>Privacy</a>
            `,
            value: this.config.options.analytics,
            type: 'checkbox'
        });

    }

    load() {
        return this.settingUtils.load();
    }

}