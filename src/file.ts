import {getFileBlob, putFile} from "@/api";

function toFile(title: string, content: string, mimeType: string){
    const blob = new Blob([content], { type: mimeType });
    return new File([blob], title, { type: mimeType });
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
