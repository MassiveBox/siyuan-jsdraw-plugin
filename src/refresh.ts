import { filenameToAssetPath } from "@/helper";

const BROADCAST_CHANNEL_NAME = 'jsdraw-image-refresh';
let channel: BroadcastChannel | null = null;

/**
 * Fetch each image with cache:'reload' to bypass the SiYuan cache, then reset
 * its src so SiYuan re-reads the fresh content from disk.
 */
function bustCacheForImages(images: HTMLImageElement[]): void {
    for (const img of images) {
        const imageURL = img.src;
        if (!imageURL) continue;

        fetch(imageURL, { cache: 'reload' })
            .then(() => {
                const url = new URL(imageURL);
                const relativePath = url.pathname.split('/assets/').pop() || '';
                img.src = relativePath ? `assets/${relativePath}` : imageURL;
            })
            .catch((e) => {
                console.warn(`Failed to refresh image: ${e}`);
            });
    }
}

/**
 * Find all img elements in the DOM that reference a specific asset file
 */
function findImagesByFilename(filename: string): HTMLImageElement[] {
    const assetPath = filenameToAssetPath(filename);
    const images: HTMLImageElement[] = [];
    const allImages = document.querySelectorAll('img');

    for (const img of allImages) {
        const imgSrc = img.src || '';
        // Match on the asset path portion or filename
        if (imgSrc.includes(assetPath) || imgSrc.includes(filename)) {
            images.push(img as HTMLImageElement);
        }
    }

    return images;
}

/**
 * Refresh all images in the open documents that reference the specified file.
 * Uses broadcast channel to notify other windows to refresh the image.
 *
 * @param filename - The asset filename (e.g., "jsdraw-abc123.svg")
 * @param isBroadcast - Whether this is a broadcast message (to avoid infinite loops)
 * @returns Number of images found for refresh
 */
export function refreshImagesForFile(filename: string, isBroadcast: boolean = false): number {
    const images = findImagesByFilename(filename);
    bustCacheForImages(images);

    if (!isBroadcast) { // if this is the original call, broadcast to other windows
        try {
            if (!channel) {
                channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
            }
            channel.postMessage({ type: 'refresh', filename });
        } catch (e) {
            console.warn(`Failed to broadcast image refresh: ${e}`);
        }
    }

    return images.length;
}

/**
 * Refresh every SVG image in the open documents.
 * This is used to refresh all whiteboards
 */
export function refreshAllSVGImages(): number {
    const images = Array.from(document.querySelectorAll('img[src$=".svg"]')) as HTMLImageElement[];
    bustCacheForImages(images);
    return images.length;
}

export function setupRefreshListener(): void {
    try {
        if (!channel) {
            channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
        }
        channel.onmessage = (event: MessageEvent) => {
            if (event.data?.type === 'refresh' && event.data?.filename) {
                refreshImagesForFile(event.data.filename, true);
            }
        };
    } catch (e) {
        console.warn(`Failed to set up refresh listener: ${e}`);
    }
}

export function teardownRefreshListener(): void {
    if (channel) {
        channel.close();
        channel = null;
    }
}
