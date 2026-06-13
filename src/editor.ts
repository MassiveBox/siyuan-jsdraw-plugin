import {MaterialIconProvider} from "@js-draw/material-icons";
import {PluginAsset, PluginFile} from "@/file";
import {JSON_MIME, STORAGE_PATH, SVG_MIME, TOOLBAR_FILENAME} from "@/const";
import {refreshImagesForFile} from "@/refresh";
import {bumpSyncMarker} from "@/sync";
import Editor, {
    AbstractToolbar,
    BackgroundComponentBackgroundType,
    Color4,
    EditorEventType, getLocalizationTable,
    Mat33,
    PenTool,
    Vec2,
    Viewport
} from "js-draw";
import StylusSettingsWidget from "@/libs/StylusSettingsWidget";
import {EditorOptions} from "@/config";
import {getSiYuanThemeCSS} from "@/theme";
import 'js-draw/styles';
import {
    ErrorReporter,
    GenericSaveError, InternationalizedError
} from "@/errors";

const ADDITIONAL_PEN_COLORS = [
    Color4.red,
    Color4.green,
    Color4.purple,
    Color4.orange,
    Color4.yellow,
];

export class PluginEditor {

    private readonly element: HTMLElement;
    private readonly editor: Editor;

    private drawingFile: PluginAsset;
    private toolbarFile: PluginFile;

    private readonly filename: string;


    private saveTimer: ReturnType<typeof setTimeout> | null = null;
    private static readonly AUTOSAVE_DELAY_MS = 500;

    private toolbar: AbstractToolbar | null = null;

    private static readonly viewParam: string = 'editorview';

    getElement(): HTMLElement { return this.element; }
    getEditor(): Editor { return this.editor; }
    getFilename(): string { return this.filename; }

    setOnClose(callback: () => void): void {
        if (this.toolbar) {
            this.toolbar.addExitButton(callback);
        }
    }

    private scheduleSave(): void {
        if (this.saveTimer) clearTimeout(this.saveTimer);
        this.saveTimer = setTimeout(() => {
            this.saveTimer = null;
            this.save().catch(e => console.warn('Auto-save failed:', e));
        }, PluginEditor.AUTOSAVE_DELAY_MS);
    }

    private serializeSVGWithViewport(): string {
        const svgElem = this.editor.toSVG();
        const rect = this.editor.viewport.visibleRect;
        const zoom = this.editor.viewport.getScaleFactor();
        Array.from(svgElem.attributes).forEach(attr => {
            if (attr.name.toLowerCase() === PluginEditor.viewParam) {
                svgElem.removeAttribute(attr.name);
            }
        });
        svgElem.setAttribute(PluginEditor.viewParam, `${rect.x} ${rect.y} ${zoom}`);
        return svgElem.outerHTML;
    }

    private constructor(filename: string) {

        this.filename = filename;

        this.element = document.createElement("div");
        this.editor = new Editor(this.element, {
            localization: getLocalizationTable([window.siyuan.config.lang]),
            iconProvider: new MaterialIconProvider(),
        });

    }

    private initEditor(): void {

        this.element.style.height = '100%';
        this.editor.getRootElement().style.height = '100%';

        const themeCSS = getSiYuanThemeCSS();
        if (themeCSS) {
            this.editor.addStyleSheet(themeCSS);
        }

        const styleElement = document.createElement('style');
        styleElement.innerHTML = `
            canvas.wetInkCanvas {
                cursor: url('/plugins/siyuan-jsdraw-plugin/webapp/cursor.png') 3 3, none;
            }
        `;
        this.element.appendChild(styleElement);

        this.editor.dispatch(this.editor.setBackgroundStyle({ autoresize: true }), false);
    
    }

    private setupAdditionalPens(count: number): void {
        const pens: PenTool[] = [];
        for (let i = 0; i < count; i++) {
            pens.push(new PenTool(this.editor, `Pen ${i + 4}`, {
                color: ADDITIONAL_PEN_COLORS[i % ADDITIONAL_PEN_COLORS.length],
                thickness: 2,
            }));
        }
        if (pens.length > 0) {
            const primaryTools = this.editor.toolController.getPrimaryTools();
            const defaultPens = primaryTools.filter(
                (tool): tool is PenTool => tool instanceof PenTool && !pens.includes(tool as PenTool)
            );
            const lastDefaultPen = defaultPens[defaultPens.length - 1] ?? primaryTools[primaryTools.length - 1];
            for (const pen of pens) {
                this.editor.toolController.addPrimaryTool(pen);
            }
            this.editor.toolController.insertToolsAfter(lastDefaultPen, pens);
        }
    }

    static async create(filename: string, defaultEditorOptions: EditorOptions, pluginI18n?: Record<string, any>): Promise<PluginEditor> {
        const instance = new PluginEditor(filename);
        instance.initEditor();
        instance.setupAdditionalPens(defaultEditorOptions.additionalPens ?? 2);
        await instance.restoreOrInitFile(defaultEditorOptions);
        await instance.genToolbar(pluginI18n);
        return instance;
    }

    async restoreOrInitFile(defaultEditorOptions: EditorOptions) {

        this.drawingFile = new PluginAsset(this.filename, SVG_MIME);
        await this.drawingFile.loadFromSiYuanFS();
        const drawingContent = this.drawingFile.getContent();

        if(drawingContent != null) {

            await this.editor.loadFromSVG(drawingContent);

            // restore position and zoom
            const svgElem = new DOMParser().parseFromString(drawingContent, SVG_MIME).documentElement;
            const editorViewStr = svgElem.getAttribute(PluginEditor.viewParam);
            if(editorViewStr != null && defaultEditorOptions.restorePosition) {
                try {
                    const [viewBoxOriginX, viewBoxOriginY, zoom] = editorViewStr.split(' ').map(x => parseFloat(x));
                    this.editor.dispatch(Viewport.transformBy(Mat33.scaling2D(zoom)));
                    this.editor.dispatch(Viewport.transformBy(Mat33.translation(Vec2.of(
                        - viewBoxOriginX,
                        - viewBoxOriginY
                    ))));
                }catch (e){}
            }

        }else{
            // it's a new drawing
            this.editor.dispatch(this.editor.setBackgroundStyle({
                color: Color4.fromHex(defaultEditorOptions.background),
                type: defaultEditorOptions.grid ? BackgroundComponentBackgroundType.Grid : BackgroundComponentBackgroundType.SolidColor,
                autoresize: true
            }));
        }

    }

    async genToolbar(pluginI18n?: Record<string, any>) {

        const toolbar = this.editor.addToolbar();
        this.toolbar = toolbar;

        // stylus settings widget
        const stylusSettings = new StylusSettingsWidget(this.editor, pluginI18n);
        toolbar.addWidget(stylusSettings);

        // restore toolbarFile state
        this.toolbarFile = new PluginFile(STORAGE_PATH, TOOLBAR_FILENAME, JSON_MIME);
        await this.toolbarFile.loadFromSiYuanFS();
        if(this.toolbarFile.getContent() != null) {
            toolbar.deserializeState(this.toolbarFile.getContent());
        }

        // save toolbar config on tool change (toolbar state is not saved in SVGs!)
        this.editor.notifier.on(EditorEventType.ToolUpdated, () => {
            this.toolbarFile.setContent(toolbar.serializeState());
            this.toolbarFile.save();
        });

        // Set up change detection listeners
        this.setupChangeListeners();
    }

    private setupChangeListeners(): void {
        // Content changes (drawing, adding objects, etc.)
        this.editor.notifier.on(EditorEventType.CommandDone, () => this.scheduleSave());
        this.editor.notifier.on(EditorEventType.CommandUndone, () => this.scheduleSave());
        
        // Viewport changes (pan/zoom) - saved in SVG's editorView attribute
        this.editor.notifier.on(EditorEventType.ViewportChanged, () => this.scheduleSave());
    }

    private async save() {
        const serialized = this.serializeSVGWithViewport();

        try {
            this.drawingFile.setContent(serialized);
            await this.drawingFile.save();

            try {
                refreshImagesForFile(this.filename);
            } catch (refreshError) {
                console.warn('Image refresh failed, but save succeeded:', refreshError);
            }

            try {
                await bumpSyncMarker();
            } catch (syncError) {
                console.warn('Sync marker update failed, but save succeeded:', syncError);
            }
        } catch (error) {
            if(error instanceof InternationalizedError) {
                ErrorReporter.error(error);
            }else{
                ErrorReporter.error(new GenericSaveError());
                console.error(error);
            }
            await navigator.clipboard.writeText(serialized);
            console.log("Couldn't save SVG: ", serialized)
            return;
        }

    }

}