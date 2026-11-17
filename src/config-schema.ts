export type NoSelectionAction = 'ask' | 'create' | 'nothing';
export type ImageColorInversion = 'on-dark' | 'on-light' | 'disabled';

export interface EditorOptions {
    restorePosition: boolean;
    grid: boolean;
    background: string;
    additionalPens: number;
    sidebars: boolean;
    disableDialogResize: boolean;
}

export interface Options {
    dialogOnDesktop: boolean;
    analytics: boolean;
    noSelectionAction: NoSelectionAction;
    editorOptions: EditorOptions;
    imageColorInversion: ImageColorInversion;
}

export const DEFAULT_ADDITIONAL_PENS = 0;
export const MAX_ADDITIONAL_PENS = 7;

export type SettingType = 'checkbox' | 'select' | 'slider' | 'textinput' | 'color';
export type SettingGroup = 'general' | 'editor';

/** Returns true when a value is acceptable. */
export type Validator = (raw: any, definition: SettingDefinition) => boolean;

export interface SettingDefinition<T = any> {
    /** Canonical, dotted path inside Options, e.g. `editorOptions.grid`. */
    path: string;
    group: SettingGroup;
    type: SettingType;
    /** Key under `i18n.settings` providing title/description/options. */
    titleKey: string;
    /** The default value. */
    default: T;
    /** Keys to fall back to if canonical isn't defined (previous config versions). */
    legacyKeys?: string[];
    /** For selects: key -> value that is stored in .json; 
     * value -> i18n key under `settings[titleKey].options`. */
    options?: Record<string, string>;
    slider?: { min: number; max: number; step: number };
    /** Accepts the whole definition, so e.g. selects can check their `options`. */
    validate?: Validator;
}

export function validateColor(hex: string): boolean {
    if (typeof hex !== 'string') return false;
    const stripped = hex.replace('#', '');
    return (stripped.length === 6 || stripped.length === 8)
        && !isNaN(Number('0x' + stripped));
}

// Reusable validators. Each receives the full definition.
const isBoolean: Validator = (raw) => typeof raw === 'boolean';

const isSelectOption: Validator = (raw, definition) =>
    typeof raw === 'string' && Object.prototype.hasOwnProperty.call(definition.options ?? {}, raw);

const isColor: Validator = (raw) => typeof raw === 'string' && validateColor(raw);

const isSliderValue: Validator = (raw, definition) => {
    const {min, max} = definition.slider;
    return typeof raw === 'number' && Number.isInteger(raw) && raw >= min && raw <= max;
};

export const SETTINGS: SettingDefinition[] = [
    {
        path: 'dialogOnDesktop',
        group: 'general',
        type: 'checkbox',
        titleKey: 'dialogOnDesktop',
        default: false,
        validate: isBoolean,
    },
    {
        path: 'editorOptions.disableDialogResize',
        group: 'general',
        type: 'checkbox',
        titleKey: 'disableDialogResize',
        default: true,
        validate: isBoolean,
    },
    {
        path: 'noSelectionAction',
        group: 'general',
        type: 'select',
        titleKey: 'noSelectionAction',
        default: 'ask',
        options: {ask: 'ask', create: 'create', nothing: 'nothing'},
        validate: isSelectOption,
    },
    {
        path: 'imageColorInversion',
        group: 'general',
        type: 'select',
        titleKey: 'imageColorInversion',
        default: 'on-dark',
        options: {'on-dark': 'onDark', 'on-light': 'onLight', 'disabled': 'disabled'},
        validate: isSelectOption,
    },
    {
        path: 'analytics',
        group: 'general',
        type: 'checkbox',
        titleKey: 'analytics',
        default: true,
        validate: isBoolean,
    },
    {
        path: 'editorOptions.grid',
        group: 'editor',
        type: 'checkbox',
        titleKey: 'grid',
        default: true,
        legacyKeys: ['grid'],
        validate: isBoolean,
    },
    {
        path: 'editorOptions.background',
        group: 'editor',
        type: 'color',
        titleKey: 'backgroundDropdown',
        default: '#ffffff',
        legacyKeys: ['background'],
        validate: isColor,
    },
    {
        path: 'editorOptions.restorePosition',
        group: 'editor',
        type: 'checkbox',
        titleKey: 'restorePosition',
        default: true,
        legacyKeys: ['restorePosition'],
        validate: isBoolean,
    },
    {
        path: 'editorOptions.sidebars',
        group: 'editor',
        type: 'checkbox',
        titleKey: 'sidebars',
        default: true,
        validate: isBoolean,
    },
    {
        path: 'editorOptions.additionalPens',
        group: 'editor',
        type: 'slider',
        titleKey: 'additionalPens',
        default: DEFAULT_ADDITIONAL_PENS,
        slider: {min: 0, max: MAX_ADDITIONAL_PENS, step: 1},
        validate: isSliderValue,
    },
];

/** Read a value from a nested object using a dot-separated path. */
export function getPath(obj: any, path: string): any {
    if (obj == null) return undefined;
    return path.split('.').reduce((current, key) => current?.[key], obj);
}

/** Write a value into a nested object using a dot-separated path, mutating the object. */
export function setPath(obj: any, path: string, value: any): void {
    const parts = path.split('.');
    let target = obj;
    for (let i = 0; i < parts.length - 1; i++) {
        const key = parts[i];
        if (target[key] == null || typeof target[key] !== 'object') {
            target[key] = {};
        }
        target = target[key];
    }
    target[parts[parts.length - 1]] = value;
}

export function defaultOptions(): Options {
    const options = {} as Options;
    for (const definition of SETTINGS) {
        setPath(options, definition.path, definition.default);
    }
    return options;
}

/** Build canonical Options from parsed conf.json (falls back to defaults) */
export function buildOptions(file?: any): Options {
    const options = defaultOptions();
    for (const definition of SETTINGS) {
        let raw = getPath(file, definition.path); // get canonical
        if (raw === undefined) { // try legacy if canonical undefined
            for (const legacyKey of definition.legacyKeys ?? []) {
                raw = getPath(file, legacyKey);
                if (raw !== undefined) break;
            }
        }
        const fallback = getPath(options, definition.path);
        // fallback to default if no legacy either
        let value = raw === undefined ? fallback : raw;
        if (definition.validate && !definition.validate(value, definition)) value = fallback;
        setPath(options, definition.path, value);
    }
    return options;
}
