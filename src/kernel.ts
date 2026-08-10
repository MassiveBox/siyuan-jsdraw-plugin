import type * as kernel from "siyuan/kernel";

const api: kernel.ISiyuan = siyuan;

api.plugin.lifecycle.onload = async () => {
    await api.logger.info(`[${api.plugin.name}] kernel plugin loaded`);

    await api.rpc.bind("ping", async () => ({
        plugin: api.plugin.name,
        platform: api.plugin.platform,
        message: "pong",
    }), "Health check for the jsdraw kernel plugin.");
};

api.plugin.lifecycle.onrunning = async () => {
    await api.logger.info(`[${api.plugin.name}] kernel plugin running`);
    await api.rpc.broadcast("notify", ["jsdraw kernel plugin is running"]);
};

api.plugin.lifecycle.onunload = async () => {
    await api.logger.info(`[${api.plugin.name}] kernel plugin unloaded`);
    await api.rpc.unbind("ping");
};
