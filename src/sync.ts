import { PluginFile } from "@/file";
import { STORAGE_PATH, JSON_MIME, SYNC_MARKER_FILENAME } from "@/const";

/**
 * Cross-device image refresh mechanism.
 *
 * SiYuan has no built-in way to notify plugins when their synced assets (like
 * SVG drawings in /data/assets/) change from another device. We work around this
 * with a two-part approach:
 *
 * 1. SIGNAL — On every image save, `bumpSyncMarker()` writes a timestamped
 *    marker file into the plugin's storage directory. This directory IS tracked
 *    by SiYuan's sync, so the marker file travels to all other devices.
 *
 * 2. DETECTION — When SiYuan detects that a plugin's storage files changed via
 *    sync, it fires a `ws-main` event with cmd `"reloadPlugin"` and the plugin
 *    listed in `data.dataChangePlugins`. The listener in `src/index.ts` catches
 *    this and calls `window.location.reload()` so all images are refreshed from
 *    disk.
 *
 * The marker file is only written locally (never read back for comparison). Its
 * sole purpose is to ensure that an image save produces a detectable change in
 * the plugin storage directory.
 */

interface SyncMarkerData {
    timestamp: number;
}

/** Writes a timestamped marker file into the plugin's storage directory. */
class SyncMarker {

    private file: PluginFile;

    constructor() {
        this.file = new PluginFile(STORAGE_PATH, SYNC_MARKER_FILENAME, JSON_MIME);
    }

    async bump(): Promise<void> {
        const timestamp = Date.now();
        this.file.setContent(JSON.stringify({ timestamp } satisfies SyncMarkerData));
        await this.file.save();
    }

}

const marker = new SyncMarker();

/**
 * Call after every successful image save. Writes the current timestamp to the
 * marker file so that SiYuan's sync detects a plugin data change on other
 * devices, triggering a page reload via the `ws-main` listener in `src/index.ts`.
 */
export async function bumpSyncMarker(): Promise<void> {
    await marker.bump();
}
