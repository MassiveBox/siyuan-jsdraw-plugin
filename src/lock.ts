import type DrawJSPlugin from "@/index";
import { LOCK_HEARTBEAT_INTERVAL_MS } from "@/const";

const WINDOW_ID_KEY = "jsdraw-window-id";

function getWindowId(): string {
    let id = sessionStorage.getItem(WINDOW_ID_KEY);
    if (!id) {
        id = crypto.randomUUID();
        sessionStorage.setItem(WINDOW_ID_KEY, id);
    }
    return id;
}

export class EditorLock {

    private timer: ReturnType<typeof setInterval> | null = null;

    private constructor(
        private readonly plugin: DrawJSPlugin,
        private readonly filename: string,
        private readonly editorId: string,
    ) {}

    static async acquire(plugin: DrawJSPlugin, filename: string): Promise<EditorLock | null> {
        const editorId = `${getWindowId()}:${filename}`;
        let res: any;
        try {
            res = await plugin.kernel.rpc.call.acquire(filename, editorId);
        } catch {
            return null;
        }
        if (!res?.granted) return null;
        return new EditorLock(plugin, filename, editorId);
    }

    startHeartbeat(): void {
        if (this.timer) return;
        this.timer = setInterval(
            () => this.plugin.kernel.rpc.notify.heartbeat(this.filename, this.editorId),
            LOCK_HEARTBEAT_INTERVAL_MS,
        );
    }

    release(): void {
        if (this.timer) clearInterval(this.timer);
        this.plugin.kernel.rpc.notify.release(this.filename, this.editorId);
    }
}
