import { filenameToAssetPath } from "@/helper";

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
 * Refresh all images in the document that reference the specified file
 * Uses fetch with cache:'reload' to bypass browser cache, then resets img src
 *
 * @param filename - The asset filename (e.g., "jsdraw-abc123.svg")
 * @returns Number of images found for refresh
 */
export function refreshImagesForFile(filename: string): number {
    const images = findImagesByFilename(filename);

    for (const img of images) {
        const imageURL = img.src;
        if (!imageURL) continue;

        // Fetch with cache:'reload' to update browser cache with fresh version
        fetch(imageURL, { cache: 'reload' })
            .then(() => {
                // Reset src to trigger reload with fresh cached content
                // Use relative path (assets/filename.svg) instead of full URL
                const url = new URL(imageURL);
                const relativePath = url.pathname.split('/assets/').pop() || '';
                img.src = relativePath ? `assets/${relativePath}` : imageURL;
            })
            .catch((e) => {
                console.warn(`Failed to refresh image: ${e}`);
            });
    }

    return images.length;
}
