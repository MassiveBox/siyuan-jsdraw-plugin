import { beforeEach, describe, expect, it, vi } from 'vitest';
import packageJson from '../package.json' assert { type: 'json' };

// In-memory stand-in for conf.json; PluginFile is mocked so these tests never
// touch the SiYuan API (and therefore never need the `siyuan` module).
let storedContent: string | null = null;

vi.mock('@/file', () => ({
    PluginFile: class {
        async loadFromSiYuanFS() {}
        getContent() { return storedContent; }
        setContent(content: string) { storedContent = content; }
        async save() {}
    },
}));

import { PluginConfig } from './config';

const CURRENT_VERSION = packageJson.version;

function setStored(value: any): void {
    storedContent = value === null ? null : JSON.stringify(value);
}

function readStored(): any {
    return storedContent === null ? null : JSON.parse(storedContent);
}

beforeEach(() => {
    storedContent = null;
});

describe('PluginConfig version detection', () => {
    it('flags a fresh install and stamps the version on acknowledgement', async () => {
        const config = new PluginConfig();
        await config.load();
        expect(config.getFirstRun()).toBe(true);
        expect(config.isUpgraded()).toBe(true);

        await config.acknowledgeUpgrade();
        expect(config.isUpgraded()).toBe(false);
        expect(readStored().version).toBe(CURRENT_VERSION);
    });

    it('does not flag a config written by the current version', async () => {
        setStored({version: CURRENT_VERSION, dialogOnDesktop: true});
        const config = new PluginConfig();
        await config.load();
        expect(config.getFirstRun()).toBe(false);
        expect(config.isUpgraded()).toBe(false);
        expect(config.options.dialogOnDesktop).toBe(true);
        expect((config.options as any).version).toBeUndefined();

        await config.save();
        expect(readStored().version).toBe(CURRENT_VERSION);
    });

    it('keeps the old version on a normal save and stamps it on acknowledgement', async () => {
        setStored({version: '0.0.1', analytics: false});
        const config = new PluginConfig();
        await config.load();
        expect(config.isUpgraded()).toBe(true);

        await config.save();
        expect(readStored().version).toBe('0.0.1');
        expect(readStored().analytics).toBe(false);

        await config.acknowledgeUpgrade();
        expect(config.isUpgraded()).toBe(false);
        expect(readStored().version).toBe(CURRENT_VERSION);
        expect(readStored().analytics).toBe(false);
    });

    it('flags a legacy config that has no version key', async () => {
        setStored({analytics: false});
        const config = new PluginConfig();
        await config.load();
        expect(config.getFirstRun()).toBe(false);
        expect(config.isUpgraded()).toBe(true);
    });

    it('flags a malformed version value', async () => {
        setStored({version: 123});
        const config = new PluginConfig();
        await config.load();
        expect(config.isUpgraded()).toBe(true);
    });
});
