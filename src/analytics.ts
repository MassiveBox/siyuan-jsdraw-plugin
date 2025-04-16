import {getBackend, getFrontend} from "siyuan";
import {JSON_MIME} from "@/const";
import packageJson from '../package.json' assert { type: 'json' };

export class Analytics {

    private readonly enabled: boolean;

    private static readonly ENDPOINT = 'https://stats.massive.box/api/send_noua';
    private static readonly WEBSITE_ID = '0a1ebbc1-d702-4f64-86ed-f62dcde9b522';

    constructor(enabled: boolean) {
        this.enabled = enabled;
    }

    async sendEvent(name: string) {

        if(!this.enabled) return;

        const sendData = (name == 'load' || name == 'install') ?
            {
                'appVersion': window.navigator.userAgent.split(' ')[0],
                'pluginVersion': packageJson.version,
                'frontend': getFrontend(),
                'backend': getBackend(),
                'language': navigator.language,
            } : {};

        await fetch(Analytics.ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': JSON_MIME,
            },
            body: JSON.stringify({
                type: 'event',
                payload: {
                    website: Analytics.WEBSITE_ID,
                    name: name,
                    data: sendData,
                },
            })
        })

    }

}