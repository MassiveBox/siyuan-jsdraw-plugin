import {getBlockByID, sql, updateBlock} from "@/api";
import {escapeRegExp} from "@/helper";

export async function findImageBlocks(src: string) {

    const sqlQuery = `
        SELECT id, markdown 
        FROM blocks 
        WHERE markdown like '%${src}%'
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
        const newContent = originalContent.replace(escapeRegExp(searchStr), replaceStr);

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
