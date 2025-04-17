import {getBlockByID, sql, updateBlock} from "@/api";
import {assetPathToIDs, IDsToAssetPath} from "@/helper";

export async function findSyncIDInProtyle(fileID: string, iter?: number): Promise<string> {

    const search = `assets/${fileID}-`;
    const blocks = await findImageBlocks(search);

    let syncID = null;

    for(const block of blocks) {
        const sources = extractImageSourcesFromMarkdown(block.markdown, search);
        for(const source of sources) {
            const ids = assetPathToIDs(source);
            if(syncID == null) {
                syncID = ids.syncID;
            }else if(ids.syncID !== syncID) {
                throw new Error(
                    "Multiple syncIDs found in documents. Remove the drawings that don't exist from your documents.\n" +
                    "Sync conflict copies can cause this error, so make sure to delete them, or at least the js-draw drawings they contain.\n" +
                    "File IDs must be unique. Close this editor tab now."
                );
            }
        }
    }

    if(!iter) iter = 0;
    if(syncID == null) {
        // when the block has just been created, we need to wait a bit before it can be found
        if(iter < 4) { // cap max time at 2s, it should be ok by then
            await new Promise(resolve => setTimeout(resolve, 500));
            return await findSyncIDInProtyle(fileID, iter + 1);
        }
    }

    return syncID;

}

export async function findImageBlocks(src: string) {

    const sqlQuery = `
        SELECT id, markdown 
        FROM blocks 
        WHERE markdown like '%](${src}%' // "](" is to check it's an image src
    `;

    try {
        return await sql(sqlQuery);
    } catch (error) {
        console.error('Error searching for image blocks:', error);
        return [];
    }

}
export async function replaceBlockContent(
    blockId: string,
    searchStr: string,
    replaceStr: string
): Promise<boolean> {
    try {

        const block = await getBlockByID(blockId);
        if (!block) {
            throw new Error('Block not found');
        }

        const originalContent = block.markdown;
        const newContent = originalContent.replaceAll(searchStr, replaceStr);

        if (newContent === originalContent) {
            return false;
        }

        await updateBlock('markdown', newContent, blockId);
        return true;

    } catch (error) {
        console.error('Failed to replace block content:', error);
        return false;
    }
}

function extractImageSourcesFromMarkdown(markdown: string, mustStartWith?: string) {
    const imageRegex = /!\[.*?\]\((.*?)\)/g; // only get images
    return Array.from(markdown.matchAll(imageRegex))
        .map(match => match[1])
        .filter(source => source.startsWith(mustStartWith)) // discard other images
}

export async function replaceSyncID(fileID: string, oldSyncID: string, newSyncID: string) {

    const search = encodeURI(IDsToAssetPath(fileID, oldSyncID)); // the API uses URI-encoded
    // find blocks containing that image
    const blocks = await findImageBlocks(search);
    if(blocks.length === 0) return false;

    for(const block of blocks) {

        // get all the image sources, with parameters
        const markdown = block.markdown;

        for(const source of extractImageSourcesFromMarkdown(markdown, search)) {
            const newSource = IDsToAssetPath(fileID, newSyncID);
            const changed = await replaceBlockContent(block.id, source, newSource);
            if(!changed) return false
        }

    }
    return true;

}
