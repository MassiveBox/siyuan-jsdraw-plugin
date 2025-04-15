import {PluginFile} from "@/file";
import {CONFIG_FILENAME, JSON_MIME, STORAGE_PATH} from "@/const";
import {Plugin} from "siyuan";
import {SettingUtils} from "@/libs/setting-utils";
import {validateColor} from "@/helper";

type Options = {
    autoResize: boolean,
    background: string
    analytics: boolean
};

export class PluginConfig {

    private file: PluginFile;

    options: Options;

    constructor() {
        this.file = new PluginFile(STORAGE_PATH, CONFIG_FILENAME, JSON_MIME);
    }

    async load() {
        await this.file.loadFromSiYuanFS();
        this.options = JSON.parse(this.file.getContent());
        if(this.options == null) {
            this.loadDefaultConfig();
        }
    }

    private loadDefaultConfig() {
        this.options = {
            autoResize: true,
            background: "#000000",
            analytics: true
        };
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
                this.config.setConfig(data);
                await this.config.save();
            }
        });

        this.settingUtils.addItem({
            key: "autoResize",
            title: "Auto Resize",
            description: "Enable to automatically resize the drawing area according to your strokes on new drawings",
            value: this.config.options.autoResize,
            type: 'checkbox'
        });

        this.settingUtils.addItem({
            key: "background",
            title: "Default Background Color",
            description: "Default background color of the drawing area for new drawings in hexadecimal.",
            value: this.config.options.background,
            type: 'textarea',
        });

        this.settingUtils.addItem({
            key: "analytics",
            title: "Analytics",
            description: `
                Enable to send anonymous usage data to the developer.
                <a href='https://massive.box'>Privacy</a>
            `,
            value: this.config.options.analytics,
            type: 'checkbox'
        });

    }

    load() {
        return this.settingUtils.load();
    }

}