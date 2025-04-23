
export class SyncIDNotFoundError extends Error {
    readonly fileID: string;

    constructor(fileID: string) {
        super(`SyncID not found for file ${fileID}`);
        this.fileID = fileID;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}

export class UnchangedProtyleError extends Error {}