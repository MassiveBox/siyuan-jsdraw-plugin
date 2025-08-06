import {showMessage} from "siyuan";

export class InternationalizedError extends Error {
    readonly key: string;

    constructor(key: string) {
        super(key);
        this.key = key;
    }
}

export class ErrorReporter {

    static i18n: any;

    constructor(i18n: any) {
        ErrorReporter.i18n = i18n;
    }

    static error(err: Error, timeout?: number) {
        console.error(err);
        let errorTxt = err.message;
        if(err instanceof InternationalizedError) {
            errorTxt = ErrorReporter.i18n.errors[err.key];
        }
        if(!timeout) {
            timeout = 0;
        }
        showMessage(errorTxt, timeout, 'error');
    }

}

export class SyncIDNotFoundError extends InternationalizedError {
    constructor() {
        super('syncIDNotFound');
    }
}

export class UnchangedProtyleError extends InternationalizedError {
    constructor() {
        super('unchangedProtyle');
    }
}

export class MultipleSyncIDsError extends InternationalizedError {
    constructor() {
        super('multipleSyncIDs');
    }
}

export class GenericSaveError extends InternationalizedError {
    constructor() {
        super('saveGeneric');
    }
}

export class NotAWhiteboardError extends InternationalizedError {
    constructor() {
        super('notAWhiteboard');
    }
}

export class InvalidBackgroundColorError extends InternationalizedError {
    constructor() {
        super('invalidBackgroundColor');
    }
}

export class NoFileIDError extends InternationalizedError {
    constructor() {
        super('noFileID');
    }
}

export class MustSelectError extends InternationalizedError {
    constructor() {
        super('mustSelect');
    }
}