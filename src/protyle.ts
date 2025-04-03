import {getBlockByID, sql, updateBlock} from "@/api";
import {DUMMY_HOST} from "@/const";

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

export async function replaceAntiCacheID(src: string) {

    const search = encodeURI(src); // the API uses URI-encoded
    // find blocks containing that image
    const blocks = await findImageBlocks(search);

    for(const block of blocks) {

        // get all the image sources, with parameters
        const markdown = block.markdown;
        const imageRegex = /!\[.*?\]\((.*?)\)/g; // only get images
        const sources = Array.from(markdown.matchAll(imageRegex))
            .map(match => match[1])
            .filter(source => source.startsWith(search)) // discard other images

        for(const source of sources) {
            const url = new URL(source, DUMMY_HOST);
            url.searchParams.set('antiCache', Date.now().toString()); // set or replace antiCache
            const newSource =  url.href.replace(DUMMY_HOST, '');
            await replaceBlockContent(block.id, source, newSource);
        }
    }

}
