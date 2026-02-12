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

export class NoFilenameError extends InternationalizedError {
    constructor() {
        super('noFileID');  // Keep key for backward compatibility with i18n
    }
}

export class MustSelectError extends InternationalizedError {
    constructor() {
        super('mustSelect');
    }
}