import {Dialog, getFrontend, openTab, Plugin} from "siyuan";
import {PluginEditor} from "@/editor";
import DrawJSPlugin from "@/index";
import {ErrorReporter, LockBlockedError, NoFilenameError} from "@/errors";
import {EditorLock} from "@/lock";

interface OpenEditorEntry {
    editor: PluginEditor;
    lock: EditorLock;
}

const openEditors = new Map<HTMLElement, OpenEditorEntry>();
export function hasOpenEditors(): boolean { return openEditors.size > 0; }

const pendingLocks = new Map<string, EditorLock>();

function releaseEditor(element: HTMLElement): void {
    const entry = openEditors.get(element);
    if (entry) {
        entry.lock.release();
        openEditors.delete(element);
    }
}

export class EditorManager {

    private filename: string;

    static async create(filename: string, _p: DrawJSPlugin): Promise<EditorManager> {
        const instance = new EditorManager();
        instance.filename = filename;
        return instance;
    }

    static registerTab(p: DrawJSPlugin) {
        p.addTab({
            'type': "whiteboard",
            async init() {
                const filename = this.data.filename;
                if (filename == null) {
                    ErrorReporter.error(new NoFilenameError());
                    return;
                }
                let lock = pendingLocks.get(filename);
                if (lock) {
                    pendingLocks.delete(filename);
                } else {
                    const editorId = this.data.editorId ?? crypto.randomUUID();
                    lock = await EditorLock.acquire(p, filename, editorId);
                    if (lock == null) {
                        ErrorReporter.error(new LockBlockedError());
                        return;
                    }
                }
                lock.startHeartbeat();
                try {
                    const editor = await PluginEditor.create(filename, p.config.options.editorOptions, p.i18n);
                    this.element.appendChild(editor.getElement());
                    openEditors.set(this.element, { editor, lock });
                }catch (error){
                    lock.release();
                    ErrorReporter.error(error);
                }
            },
            beforeDestroy() {
                releaseEditor(this.element);
            }
        });
    }

    private toTab(p: Plugin, editorId: string) {
        openTab({
            app: p.app,
            custom: {
                title: p.i18n.whiteboard,
                icon: 'iconDraw',
                id: "siyuan-jsdraw-pluginwhiteboard",
                data: {
                    filename: this.filename,
                    editorId,
                }
            }
        });
    }

    private async toDialog(p: DrawJSPlugin, lock: EditorLock) {
        lock.startHeartbeat();
        let editor: PluginEditor;
        try {
            editor = await PluginEditor.create(this.filename, p.config.options.editorOptions, p.i18n);
        }catch (error) {
            lock.release();
            ErrorReporter.error(error);
            return;
        }
        openEditors.set(editor.getElement(), { editor, lock });
        editor.setOnClose(async () => {
            releaseEditor(editor.getElement());
            dialog.destroy();
        });
        const dialog = new Dialog({
            width: "100vw",
            height: getFrontend() == "mobile" ? "100vh" : "90vh",
            content: `<div id="DrawingPanel" style="width:100%; height: 100%;"></div>`,
            disableClose: true,
        });
        dialog.element.querySelector("#DrawingPanel").appendChild(editor.getElement());
    }

    async open(p: DrawJSPlugin) {
        const isTabMode = getFrontend() != "mobile" && !p.config.options.dialogOnDesktop;

        if (isTabMode) {
            for (const [, entry] of openEditors) {
                if (entry.editor.getFilename() === this.filename) {
                    this.toTab(p, entry.lock.getEditorId());
                    return;
                }
            }
        }

        const editorId = crypto.randomUUID();
        const lock = await EditorLock.acquire(p, this.filename, editorId);
        if (lock == null) {
            ErrorReporter.error(new LockBlockedError());
            return;
        }

        if (isTabMode) {
            pendingLocks.set(this.filename, lock);
            this.toTab(p, editorId);
        } else {
            await this.toDialog(p, lock);
        }
    }

}
