import {sql} from "@/api";
import {getFile, uploadAsset} from "@/file";
import {ASSETS_PATH, DATA_PATH, SVG_MIME} from "@/const";
import {replaceBlockContent} from "@/protyle";
import {generateRandomString, getMarkdownBlock} from "@/helper";

export async function migrate() {

    let blocks = await findEmbedBlocks();
    console.log(blocks);
    const found = blocks.length > 0;

    for(const block of blocks) {
        const oldFileID = extractID(block.markdown);
        if(oldFileID) {
            const newFileID = generateRandomString() + "-" +  oldFileID;
            const file = await getFile(DATA_PATH + ASSETS_PATH + oldFileID + ".svg");
            console.log("file", file)
            const r = await uploadAsset(newFileID, SVG_MIME, file);
            console.log("r", r);
            const newMarkdown = getMarkdownBlock(r.fileID, r.syncID);
            await replaceBlockContent(block.id, block.markdown, newMarkdown);
        }
    }

}

function extractID(html: string): string | null {
    // Match the pattern: id= followed by characters until &amp; or quote
    const regex = /id=([^&"']+)/;
    const match = html.match(regex);
    return match ? match[1] : null;
}

async function findEmbedBlocks() {

    const sqlQuery = `
        SELECT id, markdown 
        FROM blocks 
        WHERE markdown like '%src="/plugins/siyuan-jsdraw-plugin/webapp/%' 
    `;

    try {
        return await sql(sqlQuery);
    } catch (error) {
        console.error('Error searching for embed blocks:', error);
        return [];
    }

}