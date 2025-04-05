import {sql} from "@/api";
import {getFile, uploadAsset} from "@/file";
import {ASSETS_PATH, DATA_PATH, SVG_MIME} from "@/const";
import {replaceBlockContent} from "@/protyle";
import {generateRandomString, getMarkdownBlock} from "@/helper";
import {Dialog} from "siyuan";

export async function migrate() {

    let blocks = await findEmbedBlocks();
    const found = blocks.length > 0;

    for(const block of blocks) {
        const oldFileID = extractID(block.markdown);
        if(oldFileID) {
            const newFileID = generateRandomString() + "-" +  oldFileID;
            const file = await getFile(DATA_PATH + ASSETS_PATH + oldFileID + ".svg");
            const r = await uploadAsset(newFileID, SVG_MIME, file);
            const newMarkdown = getMarkdownBlock(r.fileID, r.syncID);
            await replaceBlockContent(block.id, block.markdown, newMarkdown);
        }
    }

    if(found) {
        new Dialog({
            width: "90vw",
            height: "90vh",
            content: `
                <iframe 
                    style="width: 100%; height: 100%; background-color: white"
                    src="https://notes.massive.box/YRpTbbxLiD" 
                />
            `
        })
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