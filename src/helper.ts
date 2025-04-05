import { Plugin } from 'siyuan';
import {ASSETS_PATH} from "@/const";

const drawIcon: string = `
<symbol id="iconDraw" viewBox="0 0 28 28">
    <path clip-rule="evenodd" d="M26.4097 9.61208C27.196 8.8358 27.1969 7.57578 26.4117 6.79842L21.1441 1.58305C20.3597 0.806412 19.0875 0.805538 18.302 1.5811L3.55214 16.1442C3.15754 16.5338 2.87982 17.024 2.74985 17.5603L1.05726 24.5451C0.697341 26.0304 2.09375 27.3461 3.57566 26.918L10.3372 24.9646C10.8224 24.8244 11.2642 24.5658 11.622 24.2125L26.4097 9.61208ZM20.4642 12.6725L10.2019 22.8047C10.0827 22.9225 9.9354 23.0087 9.77366 23.0554L4.17079 24.6741C3.65448 24.8232 3.16963 24.359 3.2962 23.8367L4.70476 18.024C4.74809 17.8453 4.84066 17.6819 4.97219 17.552L15.195 7.45865L20.4642 12.6725ZM21.8871 11.2676L16.618 6.05372L19.0185 3.68356C19.4084 3.29865 20.0354 3.29908 20.4247 3.68454L24.271 7.49266C24.6666 7.88436 24.6661 8.52374 24.27 8.91488L21.8871 11.2676Z" fill-rule="evenodd"/>
</symbol>
`;

export function loadIcons(p: Plugin) {
    const icons = drawIcon;
    p.addIcons(icons);
}

export function getMenuHTML(icon: string, text: string): string {
    return `
    <div class="b3-list-item__first">
        <svg class="b3-list-item__graphic">
            <use xlink:href="#${icon}"></use>
        </svg>
        <span class="b3-list-item__text">${text}</span>
    </div>
    `;
}

export function generateTimeString() {
    const now = new Date();

    const year = now.getFullYear().toString();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');

    return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

export function generateRandomString() {

    const characters = 'abcdefghijklmnopqrstuvwxyz';
    let random = '';
    for (let i = 0; i < 7; i++) {
        random += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return random;

}

export function IDsToAssetPath(fileID: string, syncID: string) {
    return `${ASSETS_PATH}${fileID}-${syncID}.svg`
}
export function assetPathToIDs(assetPath: string): { fileID: string; syncID: string } | null {

    const filename = assetPath.split('/').pop() || '';
    if (!filename.endsWith('.svg')) return null;

    // Split into [basename, extension] and check format
    const [basename] = filename.split('.');
    const parts = basename.split('-');

    // Must contain exactly 2 hyphens separating 3 non-empty parts
    if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) return null;

    return {
        fileID: parts[0],
        syncID: parts[1] + '-' + parts[2]
    };

}

export function getMarkdownBlock(fileID: string, syncID: string): string {
    return `
    ![Drawing](${IDsToAssetPath(fileID, syncID)})
    `
}

// given a tag (such as a div) containing an image as a child at any level, return the src of the image
export function findImgSrc(element: HTMLElement): string | null {
    // Base case: if current element is an image
    if (element.tagName === 'IMG') {
        return (element as HTMLImageElement).src;
    }

    // Recursively check children
    if (element.children) {
        for (const child of Array.from(element.children)) {
            const src = findImgSrc(child as HTMLElement);
            if (src) return src;
        }
    }

    return null;
}

export function imgSrcToIDs(imgSrc: string | null): { fileID: string; syncID: string } | null {

    if (!imgSrc) return null;

    const url = new URL(imgSrc);
    imgSrc = decodeURIComponent(url.pathname);

    return assetPathToIDs(imgSrc);

}