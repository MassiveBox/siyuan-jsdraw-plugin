import {
    BaseWidget,
    PenTool,
    PanZoomTool,
    PanZoomMode,
    EditorEventType,
    Editor,
} from 'js-draw';
import type { PointerEvt } from 'js-draw';
import CustomInputStabilizer from './CustomInputStabilizer';
import TouchFilterInputMapper from './TouchFilterInputMapper';
import {
    InputStabilizerOptions,
    defaultStabilizerOptions,
    stabilizerParamMeta,
    cloneOptions,
} from './InputStabilizerOptions';
import {
    AutocorrectOptions,
    defaultAutocorrectOptions,
    autocorrectParamMeta,
    cloneAutocorrectOptions,
} from './AutocorrectOptions';

const stabilizerI18nKeyMap: Record<keyof InputStabilizerOptions, string> = {
    mass: 'mass',
    springConstant: 'springConstant',
    frictionCoefficient: 'friction',
    maxPointDist: 'maxPointDist',
    inertiaFraction: 'inertiaFraction',
    velocityDecayFactor: 'velocityDecay',
    minSimilarityToFinalize: 'finalizeThreshold',
};

const autocorrectI18nKeyMap: Record<keyof AutocorrectOptions, string> = {
    minTimeSeconds: 'holdTime',
    maxSpeed: 'autocorrectMaxSpeed',
    maxRadius: 'autocorrectMaxRadius',
};

interface SliderEntry {
    input: HTMLInputElement;
    valueSpan: HTMLElement;
    key: string;
    getValue: () => number;
    setValue: (v: number) => void;
}

function makeCogIcon(): Element {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 640 640');
    svg.innerHTML = `
        <path fill="var(--icon-color)" d="
            M259.1 73.5C262.1 58.7 275.2 48 290.4 48L350.2 48C365.4 48 378.5 58.7 381.5 73.5L396 143.5C410.1
            149.5 423.3 157.2 435.3 166.3L503.1 143.8C517.5 139 533.3 145 540.9 158.2L570.8 210C578.4 223.2
            575.7 239.8 564.3 249.9L511 297.3C511.9 304.7 512.3 312.3 512.3 320C512.3 327.7 511.8 335.3 511
            342.7L564.4 390.2C575.8 400.3 578.4 417 570.9 430.1L541 481.9C533.4 495 517.6 501.1 503.2
            496.3L435.4 473.8C423.3 482.9 410.1 490.5 396.1 496.6L381.7 566.5C378.6 581.4 365.5 592 350.4
            592L290.6 592C275.4 592 262.3 581.3 259.3 566.5L244.9 496.6C230.8 490.6 217.7 482.9 205.6
            473.8L137.5 496.3C123.1 501.1 107.3 495.1 99.7 481.9L69.8 430.1C62.2 416.9 64.9 400.3 76.3
            390.2L129.7 342.7C128.8 335.3 128.4 327.7 128.4 320C128.4 312.3 128.9 304.7 129.7 297.3L76.3
            249.8C64.9 239.7 62.3 223 69.8 209.9L99.7 158.1C107.3 144.9 123.1 138.9 137.5 143.7L205.3
            166.2C217.4 157.1 230.6 149.5 244.6 143.4L259.1 73.5zM320.3 400C364.5 399.8 400.2 363.9 400
            319.7C399.8 275.5 363.9 239.8 319.7 240C275.5 240.2 239.8 276.1 240 320.3C240.2 364.5 276.1
            400.2 320.3 400z
        "/>
    `;
    return svg;
}

export default class StylusSettingsWidget extends BaseWidget {

    private stabOptions: InputStabilizerOptions;
    private autocorrectOptions: AutocorrectOptions;
    private ignoreTouch: boolean;
    private touchFilter: TouchFilterInputMapper;
    private updateInputs: () => void = () => {};
    private i18n: Record<string, string>;
    private patchedPens: WeakSet<PenTool> = new WeakSet();

    constructor(editor: Editor, pluginI18n?: Record<string, any>) {
        super(editor, 'stylus-settings-widget');
        this.stabOptions = cloneOptions(defaultStabilizerOptions);
        this.autocorrectOptions = cloneAutocorrectOptions(defaultAutocorrectOptions);
        this.ignoreTouch = false;

        this.i18n = (pluginI18n?.stylusSettings ?? {}) as Record<string, string>;

        this.touchFilter = new TouchFilterInputMapper();
        const panZoomTools = this.editor.toolController.getMatchingTools(PanZoomTool);
        this.touchFilter.setShouldAllowTouch(() =>
            panZoomTools.some((tool) =>
                tool.getToolGroup() !== null
                && tool.isEnabled()
                && (tool.getMode() & (PanZoomMode.OneFingerTouchGestures
                    | PanZoomMode.TwoFingerTouchGestures
                    | PanZoomMode.SinglePointerGestures)) !== 0,
            ),
        );
        this.editor.toolController.addInputMapper(this.touchFilter);

        this.container.classList.add('dropdownShowable');

        this.editor.notifier.on(EditorEventType.ToolUpdated, (evt) => {
            if (evt.kind === EditorEventType.ToolUpdated && evt.tool instanceof PenTool) {
                this.replaceDefaultStabilizer(evt.tool);
                this.patchAutocorrect(evt.tool);
            }
        });
    }

    protected getTitle(): string {
        return this.i18n.title;
    }

    protected createIcon(): Element {
        return makeCogIcon();
    }

    protected handleClick(): void {
        this.setDropdownVisible(!this.isDropdownVisible());
    }

    protected getHelpText(): string {
        return this.i18n.helpText;
    }

    private setIgnoreTouch(enabled: boolean) {
        this.ignoreTouch = enabled;
        this.touchFilter.setEnabled(enabled);
        this.updateInputs();
    }

    private getAllPenTools(): PenTool[] {
        return this.editor.toolController.getMatchingTools(PenTool);
    }

    private replaceDefaultStabilizer(pen: PenTool) {
        const mapper = pen.getInputMapper();
        if (mapper !== null && !(mapper instanceof CustomInputStabilizer)) {
            pen.setInputMapper(new CustomInputStabilizer(this.editor.viewport, this.stabOptions));
        }
    }

    private applyStabilizerOptions() {
        for (const pen of this.getAllPenTools()) {
            const mapper = pen.getInputMapper();
            if (mapper instanceof CustomInputStabilizer) {
                mapper.setOptions(this.stabOptions);
            } else if (mapper !== null) {
                pen.setInputMapper(
                    new CustomInputStabilizer(this.editor.viewport, this.stabOptions),
                );
            }
        }
    }

    private patchAutocorrect(pen: PenTool) {
        if (this.patchedPens.has(pen)) return;
        this.patchedPens.add(pen);

        const origOnPointerDown = pen.onPointerDown.bind(pen);
        const self = this;
        (pen as any).onPointerDown = function (event: PointerEvt) {
            const result = origOnPointerDown(event);
            const detector = (this as any).stationaryDetector;
            if (detector) {
                detector.cancelStationaryTimeout();
                detector.config = self.autocorrectOptions;
                detector.setStationaryTimeout(self.autocorrectOptions.minTimeSeconds * 1000);
            }
            return result;
        };
    }

    private applyAutocorrectOptions() {
        for (const pen of this.getAllPenTools()) {
            this.patchAutocorrect(pen);
        }
    }

    private makeSectionHeader(text: string): HTMLElement {
        const header = document.createElement('div');
        header.style.fontWeight = 'bold';
        header.style.paddingTop = '6px';
        header.style.paddingBottom = '2px';
        header.style.gridColumn = '1 / -1';
        header.innerText = text;
        return header;
    }

    private makeSliderRow(
        label: string,
        value: number,
        meta: { min: number; max: number; step: number },
        inputId: string,
        onChange: (val: number) => void,
    ): { row: HTMLElement; entry: SliderEntry } {
        const labelEl = document.createElement('label');
        labelEl.innerText = label;
        labelEl.htmlFor = inputId;

        const input = document.createElement('input');
        input.type = 'range';
        input.id = inputId;
        input.min = String(meta.min);
        input.max = String(meta.max);
        input.step = String(meta.step);
        input.value = String(value);

        const valueSpan = document.createElement('span');
        valueSpan.style.textAlign = 'right';
        valueSpan.style.minWidth = '3.5em';
        valueSpan.style.fontVariantNumeric = 'tabular-nums';
        valueSpan.innerText = String(value);

        input.oninput = () => {
            const val = parseFloat(input.value);
            valueSpan.innerText = String(val);
            onChange(val);
        };

        const row = document.createElement('div');
        row.style.display = 'contents';
        row.replaceChildren(labelEl, input, valueSpan);

        return {
            row,
            entry: { input, valueSpan, key: inputId, getValue: () => parseFloat(input.value), setValue: (v) => { input.value = String(v); valueSpan.innerText = String(v); } },
        };
    }

    private addSliderSection(
        container: HTMLElement,
        allEntries: SliderEntry[],
        sectionLabel: string,
        paramMeta: { key: string; min: number; max: number; step: number }[],
        i18nKeyMap: Record<string, string>,
        keyPrefix: string,
        options: Record<string, number>,
        apply: () => void,
    ) {
        container.appendChild(this.makeSectionHeader(sectionLabel));
        for (const meta of paramMeta) {
            const labelText = this.i18n[i18nKeyMap[meta.key]] ?? meta.key;
            const inputId = `${keyPrefix}-${meta.key}`;
            const { row, entry } = this.makeSliderRow(
                labelText, options[meta.key], meta, inputId,
                (val) => { options[meta.key] = val; apply(); },
            );
            container.appendChild(row);
            allEntries.push(entry);
        }
    }

    protected fillDropdown(dropdown: HTMLElement): boolean {
        const container = document.createElement('div');
        container.classList.add(
            'toolbar-spacedList',
            'toolbar-nonbutton-controls-main-list',
        );
        container.style.display = 'grid';
        container.style.gridTemplateColumns = 'auto 1fr auto';
        container.style.alignItems = 'center';
        container.style.gap = '4px 8px';

        const allEntries: SliderEntry[] = [];

        this.addSliderSection(container, allEntries,
            this.i18n.sectionStabilization, stabilizerParamMeta,
            stabilizerI18nKeyMap, 'toolbar-stylus-stab',
            this.stabOptions as unknown as Record<string, number>,
            () => this.applyStabilizerOptions());

        this.addSliderSection(container, allEntries,
            this.i18n.sectionAutocorrect, autocorrectParamMeta,
            autocorrectI18nKeyMap, 'toolbar-stylus-ac',
            this.autocorrectOptions as unknown as Record<string, number>,
            () => this.applyAutocorrectOptions());

        container.appendChild(this.makeSectionHeader(this.i18n.sectionInput));

        const ignoreTouchRow = document.createElement('div');
        ignoreTouchRow.style.display = 'contents';
        const ignoreTouchLabel = document.createElement('label');
        ignoreTouchLabel.innerText = this.i18n.ignoreTouch;
        const ignoreTouchId = 'toolbar-stylus-ignore-touch';
        ignoreTouchLabel.htmlFor = ignoreTouchId;
        const ignoreTouchCheckbox = document.createElement('input');
        ignoreTouchCheckbox.type = 'checkbox';
        ignoreTouchCheckbox.id = ignoreTouchId;
        ignoreTouchCheckbox.checked = this.ignoreTouch;
        ignoreTouchCheckbox.oninput = () => {
            this.setIgnoreTouch(ignoreTouchCheckbox.checked);
        };
        const ignoreTouchSpacer = document.createElement('span');
        ignoreTouchRow.replaceChildren(ignoreTouchLabel, ignoreTouchCheckbox, ignoreTouchSpacer);
        container.appendChild(ignoreTouchRow);

        const resetButton = document.createElement('button');
        resetButton.type = 'button';
        resetButton.classList.add('toolbar-button');
        resetButton.innerText = this.i18n.resetDefaults;
        resetButton.style.marginTop = '8px';
        resetButton.style.gridColumn = '1 / -1';
        resetButton.style.maxWidth = 'none';
        resetButton.style.width = '100%';
        resetButton.onclick = () => {
            this.stabOptions = cloneOptions(defaultStabilizerOptions);
            this.autocorrectOptions = cloneAutocorrectOptions(defaultAutocorrectOptions);
            this.ignoreTouch = false;
            this.touchFilter.setEnabled(false);
            this.updateInputs();
            this.applyStabilizerOptions();
            this.applyAutocorrectOptions();
        };
        container.appendChild(resetButton);

        const moreText = document.createElement('p');
        moreText.style.gridColumn = '1 / -1';
        moreText.style.fontSize = '0.85em';
        moreText.style.opacity = '0.7';
        moreText.style.margin = '4px 0 0 0';
        moreText.innerText = this.i18n.moreSettings;
        container.appendChild(moreText);

        dropdown.appendChild(container);

        this.updateInputs = () => {
            for (const meta of stabilizerParamMeta) {
                const entry = allEntries.find(e => e.key === `toolbar-stylus-stab-${meta.key}`);
                entry?.setValue(this.stabOptions[meta.key]);
            }
            for (const meta of autocorrectParamMeta) {
                const entry = allEntries.find(e => e.key === `toolbar-stylus-ac-${meta.key}`);
                entry?.setValue(this.autocorrectOptions[meta.key]);
            }
            ignoreTouchCheckbox.checked = this.ignoreTouch;
        };

        return true;
    }

    serializeState(): Record<string, any> {
        return {
            ...super.serializeState(),
            stabOptions: { ...this.stabOptions },
            autocorrectOptions: { ...this.autocorrectOptions },
            ignoreTouch: this.ignoreTouch,
        };
    }

    deserializeFrom(state: Record<string, any>): void {
        super.deserializeFrom(state);
        if (state.stabOptions && typeof state.stabOptions === 'object') {
            this.stabOptions = { ...defaultStabilizerOptions, ...state.stabOptions };
        }
        if (state.autocorrectOptions && typeof state.autocorrectOptions === 'object') {
            this.autocorrectOptions = { ...defaultAutocorrectOptions, ...state.autocorrectOptions };
        }
        if (typeof state.ignoreTouch === 'boolean') {
            this.ignoreTouch = state.ignoreTouch;
            this.touchFilter.setEnabled(this.ignoreTouch);
        }
        this.applyStabilizerOptions();
        this.applyAutocorrectOptions();
        this.updateInputs();
    }
}
