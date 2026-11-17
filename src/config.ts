import {PluginFile} from "@/file";
import {CONFIG_FILENAME, JSON_MIME, STORAGE_PATH} from "@/const";
import {buildOptions} from '@/config-schema';

import type { Options } from '@/config-schema';

export type { Options, EditorOptions, NoSelectionAction, ImageColorInversion } from '@/config-schema';

export class PluginConfig {

    private file: PluginFile;

    options: Options;
    private firstRun: boolean = false;

    getFirstRun() { return this.firstRun }

    constructor() {
        this.file = new PluginFile(STORAGE_PATH, CONFIG_FILENAME, JSON_MIME);
    }

    async load() {
        const stored = await this.readConfigFile();
        this.options = buildOptions(stored);
        this.firstRun = stored == null;
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
        this.file.setContent(JSON.stringify(this.options));
        await this.file.save();
    }

    setOptions(options: Options) {
        this.options = options;
    }

}
