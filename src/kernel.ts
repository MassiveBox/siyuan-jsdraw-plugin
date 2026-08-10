import type * as kernel from "siyuan/kernel";
import { LOCK_STALE_MS } from "./const";

const api: kernel.ISiyuan = siyuan;

interface Lock {
    editorId: string;
    lastHeartbeat: number;
}

const locks = new Map<string, Lock>();

api.plugin.lifecycle.onload = async () => {
    await api.logger.info(`[${api.plugin.name}] kernel plugin loaded`);

    await api.rpc.bind("acquire", async (filename: string, editorId: string) => {
        const now = Date.now();
        const existing = locks.get(filename);
        if (existing && existing.editorId !== editorId && (now - existing.lastHeartbeat) <= LOCK_STALE_MS) {
            return { granted: false };
        }
        locks.set(filename, { editorId, lastHeartbeat: now });
        return { granted: true };
    }, "Acquire an edit lock for a whiteboard filename.");

    await api.rpc.bind("release", async (filename: string, editorId: string) => {
        const existing = locks.get(filename);
        if (existing && existing.editorId === editorId) {
            locks.delete(filename);
        }
        return { released: true };
    }, "Release an edit lock for a whiteboard filename.");

    await api.rpc.bind("heartbeat", async (filename: string, editorId: string) => {
        const existing = locks.get(filename);
        if (existing && existing.editorId === editorId) {
            existing.lastHeartbeat = Date.now();
        }
        return { ok: true };
    }, "Refresh an edit lock's heartbeat.");

    await api.rpc.bind("broadcastRefresh", async (filename: string) => {
        await api.rpc.broadcast("refresh", [filename]);
    }, "Broadcast an image-refresh signal to all frontend windows for the given filename.");
};

api.plugin.lifecycle.onrunning = async () => {
    await api.logger.info(`[${api.plugin.name}] kernel plugin running`);
};

api.plugin.lifecycle.onunload = async () => {
    locks.clear();
    await api.rpc.unbind("acquire");
    await api.rpc.unbind("release");
    await api.rpc.unbind("heartbeat");
    await api.rpc.unbind("broadcastRefresh");
    await api.logger.info(`[${api.plugin.name}] kernel plugin unloaded`);
};
