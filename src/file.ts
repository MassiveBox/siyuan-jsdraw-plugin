import {getFileBlob, putFile, upload} from "@/api";
import {ASSETS_PATH} from "@/const";
import {assetPathToIDs} from "@/helper";

function toFile(title: string, content: string, mimeType: string){
    const blob = new Blob([content], { type: mimeType });
    return new File([blob], title, { type: mimeType });
}

// upload asset to the assets folder, return fileID and syncID
export async function uploadAsset(fileID: string, mimeType: string, content: string) {

    const file = toFile(fileID + ".svg", content, mimeType);
    console.log(1, file)

    let r = await upload('/' + ASSETS_PATH, [file]);
    console.log(2, r)
    if(r.errFiles) {
        throw new Error("Failed to upload file");
    }
    return assetPathToIDs(r.succMap[file.name]);

}

export function saveFile(path: string, mimeType: string, content: string) {

    const file = toFile(path.split('/').pop(), content, mimeType);

    try {
        putFile(path, false, file);
    } catch (error) {
        console.error("Error saving file:", error);
        throw error;
    }

}

export async function getFile(path: string) {

    const blob = await getFileBlob(path);
    const jsonText = await blob.text();

    // if we got a 404 api response, we will return null
    try {
        const res = JSON.parse(jsonText);
        if(res.code == 404) {
            return null;
        }
    }catch {}

    // js-draw expects a string!
    return jsonText;

}
