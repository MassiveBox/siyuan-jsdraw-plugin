import {getFileBlob, putFile} from "@/api";
import {ASSETS_PATH, DATA_PATH} from "@/const";

abstract class PluginFileBase {

    protected content: string | null;

    protected fileName: string;
    protected folderPath: string;
    protected mimeType: string;

    getContent() { return this.content; }
    setContent(content: string) { this.content = content; }
    setFileName(fileName: string) { this.fileName = fileName; }

    private setFolderPath(folderPath: string) {
        if(folderPath.startsWith('/') && folderPath.endsWith('/')) {
            this.folderPath = folderPath;
        }else{
            throw new Error("folderPath must start and end with /");
        }
    }

    // folderPath must start and end with /
    constructor(folderPath: string, fileName: string, mimeType: string) {
        this.setFolderPath(folderPath);
        this.fileName = fileName;
        this.mimeType = mimeType;
    }

    async loadFromSiYuanFS() {
        const blob = await getFileBlob(this.folderPath + this.fileName);
        const text = await blob.text();

        try {
            const res = JSON.parse(text);
            if(res.code == 404) {
                this.content = null;
                return;
            }
        }catch {}

        this.content = text;
    }

    protected toFile(customFilename?: string): File {
        let filename = customFilename || this.fileName;
        const blob = new Blob([this.content], { type: this.mimeType });
        return new File([blob], filename, { type: this.mimeType, lastModified: Date.now() });
    }

}

export class PluginFile extends PluginFileBase {

    async save() {
        const file = this.toFile();
        try {
            await putFile(this.folderPath + this.fileName, false, file);
        } catch (error) {
            console.error("Error saving file:", error);
            throw error;
        }
    }

}

export class PluginAsset extends PluginFileBase {

    private filename: string

    getFilename() { return this.filename; }

    constructor(filename: string, mimeType: string) {
        super(DATA_PATH + ASSETS_PATH, filename, mimeType);
        this.filename = filename;
    }

    async save() {
        const file = this.toFile();
        await putFile(this.folderPath + this.filename, false, file);
    }

}