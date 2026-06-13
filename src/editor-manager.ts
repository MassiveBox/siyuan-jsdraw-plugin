import {Dialog, getFrontend, openTab, Plugin} from "siyuan";
import {PluginEditor} from "@/editor";
import DrawJSPlugin from "@/index";
import {ErrorReporter, NoFilenameError} from "@/errors";

const openEditors = new Map<HTMLElement, PluginEditor>();
export function hasOpenEditors(): boolean { return openEditors.size > 0; }

export class EditorManager {

    private editor: PluginEditor
    setEditor(editor: PluginEditor) { this.editor = editor;}

    static async create(filename: string, p: DrawJSPlugin) {
        let instance = new EditorManager();
        try {
            let editor = await PluginEditor.create(filename, p.config.options.editorOptions, p.i18n);
            instance.setEditor(editor);
            openEditors.set(editor.getElement(), editor);
        }catch (error) {
            ErrorReporter.error(error);
        }
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
                try {
                    const editor = await PluginEditor.create(filename, p.config.options.editorOptions, p.i18n);
                    this.element.appendChild(editor.getElement());
                    openEditors.set(this.element, editor);
                }catch (error){
                    ErrorReporter.error(error);
                }
            },
            beforeDestroy() {
                openEditors.delete(this.element);
            }
        });
    }

    toTab(p: Plugin) {
        openTab({
            app: p.app,
            custom: {
                title: p.i18n.whiteboard,
                icon: 'iconDraw',
                id: "siyuan-jsdraw-pluginwhiteboard",
                data: {
                    filename: this.editor.getFilename(),
                }
            }
        });
    }

    toDialog(_p: DrawJSPlugin) {
        const pluginEditor = this.editor;

        pluginEditor.setOnClose(async () => {
            openEditors.delete(pluginEditor.getElement());
            dialog.destroy();
        });

        const dialog = new Dialog({
            width: "100vw",
            height: getFrontend() == "mobile" ? "100vh" : "90vh",
            content: `<div id="DrawingPanel" style="width:100%; height: 100%;"></div>`,
            disableClose: true,
        });
        dialog.element.querySelector("#DrawingPanel").appendChild(pluginEditor.getElement());
    }

    open(p: DrawJSPlugin) {
        if(getFrontend() != "mobile" && !p.config.options.dialogOnDesktop) {
            this.toTab(p);
        } else {
            this.toDialog(p);
        }
    }

}
