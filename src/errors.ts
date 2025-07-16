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
            errorTxt = ErrorReporter.i18n[err.key];
        }
        if(!timeout) {
            timeout = 0;
        }
        showMessage(errorTxt, timeout, 'error');
    }

}

export class SyncIDNotFoundError extends InternationalizedError {
    constructor() {
        super('errSyncIDNotFound');
    }
}

export class UnchangedProtyleError extends InternationalizedError {
    constructor() {
        super('errUnchangedProtyle');
    }
}

export class MultipleSyncIDsError extends InternationalizedError {
    constructor() {
        super('errMultipleSyncIDs');
    }
}

export class GenericSaveError extends InternationalizedError {
    constructor() {
        super('errSaveGeneric');
    }
}

export class NotAWhiteboardError extends InternationalizedError {
    constructor() {
        super('errNotAWhiteboard');
    }
}

export class InvalidBackgroundColorError extends InternationalizedError {
    constructor() {
        super('errInvalidBackgroundColor');
    }
}

export class NoFileIDError extends InternationalizedError {
    constructor() {
        super('errNoFileID');
    }
}

export class MustSelectError extends InternationalizedError {
    constructor() {
        super('errMustSelect');
    }
}