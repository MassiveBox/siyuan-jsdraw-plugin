import Editor, {
    BackgroundComponentBackgroundType,
    Color4,
    ImageComponent,
    Mat33,
    Vec2,
} from "@massivebox/js-draw";
import * as pdfjsLib from "pdfjs-dist";
import PdfWorker from "pdfjs-dist/build/pdf.worker.mjs?worker&inline";
import { getFileBlob } from "@/api";
import { PluginAsset } from "@/file";
import { DATA_PATH, ASSETS_PATH, DUMMY_HOST, SVG_MIME } from "@/const";
import { PdfEmptyError, PdfLoadError, PdfRenderError } from "@/errors";
import type { EditorOptions } from "@/config";

// Render scale for PDF pages (~200dpi at 2x).
const PDF_RENDER_SCALE = 2;

let workerInitialized = false;
function ensureWorker() {
    if (!workerInitialized) {
        pdfjsLib.GlobalWorkerOptions.workerPort = new PdfWorker();
        workerInitialized = true;
    }
}

/**
 * Extract the SiYuan asset path (e.g. `/data/assets/foo.pdf`) of a PDF from
 * a context-menu target element. Handles both plain markdown links
 * (`open-menu-link`) and PDF annotation refs (`open-menu-fileannotationref`).
 */
export function extractPdfAssetPath(element: HTMLElement): string | null {
    const candidates: HTMLElement[] = [];
    if (element.hasAttribute?.("href") || element.hasAttribute?.("data-href")) {
        candidates.push(element);
    }
    candidates.push(
        ...Array.from(element.querySelectorAll<HTMLElement>("[href],[data-href]"))
    );
    const closestLink = element.closest?.("a[href]") as HTMLElement | null;
    if (closestLink && !candidates.includes(closestLink)) {
        candidates.push(closestLink);
    }

    for (const el of candidates) {
        const rawHref =
            el.getAttribute("href") ?? el.getAttribute("data-href") ?? "";
        const path = pdfHrefToAssetPath(rawHref);
        if (path) return path;
    }
    return null;
}

function pdfHrefToAssetPath(href: string): string | null {
    if (!href) return null;
    // strip query string / hash, then check extension
    const clean = href.split("?")[0].split("#")[0];
    if (!clean.toLowerCase().endsWith(".pdf")) return null;

    let pathname: string;
    try {
        pathname = decodeURIComponent(new URL(clean, DUMMY_HOST).pathname);
    } catch {
        return null;
    }
    const idx = pathname.indexOf(ASSETS_PATH);
    if (idx === -1) return null;
    return DATA_PATH + pathname.slice(idx);
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () =>
            reject(new PdfRenderError());
        img.src = dataUrl;
    });
}

/** Render one PDF page to a PNG data URL. */
async function renderPageToDataUrl(
    page: pdfjsLib.PDFPageProxy
): Promise<RasterizedPage> {
    const viewport = page.getViewport({ scale: PDF_RENDER_SCALE });
    const canvas = document.createElement("canvas");
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new PdfRenderError();
    await page.render({ canvasContext: ctx, viewport }).promise;
    return {
        dataUrl: canvas.toDataURL("image/png"),
        width: canvas.width,
        height: canvas.height,
    };
}

/** One PDF page rasterized to a PNG data URL. */
export interface RasterizedPage {
    dataUrl: string;
    width: number;
    height: number;
}

/**
 * Render all pages of a PDF (given as bytes) into a js-draw SVG string,
 * with the pages stacked in a single centered column.
 */
export async function renderPdfToSvg(
    pdfData: ArrayBuffer,
    editorOptions: EditorOptions
): Promise<string> {
    const pdf = await openPdfDocument(pdfData);
    try {
        const pages = await rasterizePdfPages(pdf);
        return await composePagesToSvg(pages, editorOptions);
    } finally {
        await pdf.destroy().catch(() => {});
    }
}

/** Parse PDF bytes into a document, throwing on load failure or empty PDFs. */
async function openPdfDocument(pdfData: ArrayBuffer): Promise<pdfjsLib.PDFDocumentProxy> {
    ensureWorker();

    let pdf: pdfjsLib.PDFDocumentProxy;
    try {
        pdf = await pdfjsLib.getDocument({ data: pdfData.slice(0) }).promise;
    } catch (e) {
        console.error("PDF load failed:", e);
        throw new PdfLoadError();
    }
    if (pdf.numPages < 1) {
        await pdf.destroy().catch(() => {});
        throw new PdfEmptyError();
    }
    return pdf;
}

/** Rasterize every page of an open PDF document, in order. */
async function rasterizePdfPages(pdf: pdfjsLib.PDFDocumentProxy): Promise<RasterizedPage[]> {
    const pages: RasterizedPage[] = [];
    try {
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            try {
                pages.push(await renderPageToDataUrl(page));
            } finally {
                page.cleanup();
            }
            // yield to the event loop so the UI stays responsive on big PDFs
            await new Promise((r) => setTimeout(r, 0));
        }
    } catch (e) {
        console.error("PDF render failed:", e);
        if (e instanceof PdfRenderError) throw e;
        throw new PdfRenderError();
    }
    if (pages.length < 1) throw new PdfEmptyError();
    return pages;
}

/** Compose rasterized pages into a headless editor and serialize to SVG. */
async function composePagesToSvg(
    pages: RasterizedPage[],
    editorOptions: EditorOptions
): Promise<string> {
    const maxWidth = Math.max(...pages.map((p) => p.width));

    const container = document.createElement("div");
    container.style.cssText =
        "position:fixed;left:-99999px;top:0;width:100px;height:100px;visibility:hidden;";
    document.body.appendChild(container);
    try {
        const editor = new Editor(container, {});
        editor.dispatch(
            editor.setBackgroundStyle({
                color: Color4.fromHex(editorOptions.background),
                type: editorOptions.grid
                    ? BackgroundComponentBackgroundType.Grid
                    : BackgroundComponentBackgroundType.SolidColor,
                autoresize: true,
            })
        );

        let yOffset = 0;
        for (const page of pages) {
            const img = await loadImage(page.dataUrl);
            const xOffset = Math.floor((maxWidth - page.width) / 2);
            const component = await ImageComponent.fromImage(
                img,
                Mat33.translation(Vec2.of(xOffset, yOffset))
            );
            editor.dispatch(editor.image.addComponent(component));
            yOffset += page.height;
        }

        return editor.toSVG().outerHTML;
    } finally {
        container.remove();
    }
}

/**
 * Fetch a PDF asset from SiYuan storage, convert all its pages into a new
 * whiteboard SVG stacked in a column, save it immediately, and return the
 * new SVG filename.
 */
export async function importPdfAsset(
    pdfAssetPath: string,
    editorOptions: EditorOptions
): Promise<string> {
    const blob = await getFileBlob(pdfAssetPath);
    if (!blob) throw new PdfLoadError();
    const data = await blob.arrayBuffer();
    const svg = await renderPdfToSvg(data, editorOptions);

    const filename = `jsdraw-${window.Lute.NewNodeID()}.svg`;
    const drawingFile = new PluginAsset(filename, SVG_MIME);
    drawingFile.setContent(svg);
    await drawingFile.save();
    return filename;
}
