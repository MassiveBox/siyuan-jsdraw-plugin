import {PluginFile} from "@/file";
import {CONFIG_FILENAME, JSON_MIME, PLUGIN_VERSION, STORAGE_PATH} from "@/const";
import {buildOptions} from '@/config-schema';

import type { Options } from '@/config-schema';

export type { Options, EditorOptions, NoSelectionAction, ImageColorInversion } from '@/config-schema';

export class PluginConfig {

    private file: PluginFile;

    options: Options;
    private firstRun: boolean = false;
    private upgraded: boolean = false;
    /** Version recorded in conf.json. */
    private savedVersion: string | null = null;

    getFirstRun() { return this.firstRun }

    isUpgraded() { return this.upgraded }

    constructor() {
        this.file = new PluginFile(STORAGE_PATH, CONFIG_FILENAME, JSON_MIME);
    }

    async load() {
        const stored = await this.readConfigFile();
        this.options = buildOptions(stored);
        this.firstRun = stored == null;
        
        this.savedVersion = stored?.version;
        this.upgraded = this.savedVersion !== PLUGIN_VERSION;
    }

    private async readConfigFile(): Promise<any | null> {
        await this.file.loadFromSiYuanFS();
        const content = this.file.getContent();
        if (!content) return null;
        try {
            const parsed = JSON.parse(content);
            return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
        } catch (error) {
            console.warn('[jsdraw] Could not parse config file, using defaults:', error);
            return null;
        }
    }

    async save() {
        this.file.setContent(JSON.stringify({...this.options, version: this.savedVersion}));
        await this.file.save();
    }

    /** Mark the detected upgrade as handled and stamp conf.json with the current version. */
    async acknowledgeUpgrade() {
        this.upgraded = false;
        this.savedVersion = PLUGIN_VERSION;
        await this.save();
    }

    setOptions(options: Options) {
        this.options = options;
    }

}
