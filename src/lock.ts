import type DrawJSPlugin from "@/index";
import { LOCK_HEARTBEAT_INTERVAL_MS } from "@/const";

/**
 * Cross-window edit lock for a whiteboard, backed by the kernel plugin's
 * lock registry (src/kernel.ts). Ensures only one editor edits a given file
 * at a time across all windows of a SiYuan instance.
 *
 * - editorId: stable identity stored in the tab's data, so it follows the tab
 *   on move and survives reload. The kernel treats an acquire from the same
 *   editorId as a refresh (reclaim), letting a moved/reloaded tab take its
 *   own lock back without being denied.
 * - generation: a per-acquire token returned by the kernel. Sent with every
 *   release/heartbeat and checked there, so a stale release from a tab that
 *   moved away (old generation) cannot delete the lock the new holder
 *   refreshed (new generation).
 * - heartbeat: keeps the lock alive; if it stops (crash, closed window), the
 *   kernel evicts the lock after LOCK_STALE_MS. Normal close releases
 *   instantly via release(), which matches the current generation.
 */
export class EditorLock {

    private timer: ReturnType<typeof setInterval> | null = null;

    private constructor(
        private readonly plugin: DrawJSPlugin,
        private readonly filename: string,
        private readonly editorId: string,
        private readonly generation: number,
    ) {}

    getEditorId(): string { return this.editorId; }

    static async acquire(plugin: DrawJSPlugin, filename: string, editorId: string): Promise<EditorLock | null> {
        let res: any;
        try {
            res = await plugin.kernel.rpc.call.acquire(filename, editorId);
        } catch {
            return null;
        }
        if (!res?.granted) return null;
        return new EditorLock(plugin, filename, editorId, res.generation);
    }

    startHeartbeat(): void {
        if (this.timer) return;
        this.timer = setInterval(
            () => this.plugin.kernel.rpc.notify.heartbeat(this.filename, this.editorId, this.generation),
            LOCK_HEARTBEAT_INTERVAL_MS,
        );
    }

    release(): void {
        if (this.timer) clearInterval(this.timer);
        this.plugin.kernel.rpc.notify.release(this.filename, this.editorId, this.generation);
    }
}
