import { describe, expect, it } from 'vitest';
import {
    SETTINGS,
    buildOptions,
    defaultOptions,
    getPath,
    setPath,
    validateColor,
} from './config-schema';

describe('validateColor', () => {
    it('accepts 6 and 8 digit hex values with or without a hash', () => {
        expect(validateColor('#ffffff')).toBe(true);
        expect(validateColor('#00000000')).toBe(true);
        expect(validateColor('1e2227')).toBe(true);
    });

    it('rejects malformed values', () => {
        expect(validateColor('#fff')).toBe(false);
        expect(validateColor('#gggggg')).toBe(false);
        expect(validateColor('not a color')).toBe(false);
        expect(validateColor(null)).toBe(false);
        expect(validateColor(123 as any)).toBe(false);
    });
});

describe('defaultOptions', () => {
    it('matches the documented defaults', () => {
        expect(defaultOptions()).toEqual({
            dialogOnDesktop: false,
            analytics: true,
            noSelectionAction: 'ask',
            imageColorInversion: 'on-dark',
            editorOptions: {
                grid: true,
                background: '#ffffff',
                restorePosition: true,
                sidebars: true,
                additionalPens: 0,
                disableDialogResize: true,
            },
        });
    });
});

describe('buildOptions', () => {
    it('uses defaults when nothing is stored', () => {
        expect(buildOptions()).toEqual(defaultOptions());
        expect(buildOptions(null)).toEqual(defaultOptions());
    });

    it('reads values from the nested conf.json structure', () => {
        const options = buildOptions({
            dialogOnDesktop: true,
            analytics: false,
            noSelectionAction: 'create',
            imageColorInversion: 'disabled',
            editorOptions: {
                grid: false,
                background: '#1e2227',
                restorePosition: false,
                sidebars: false,
                additionalPens: 3,
                disableDialogResize: false,
            },
        });
        expect(options.dialogOnDesktop).toBe(true);
        expect(options.analytics).toBe(false);
        expect(options.noSelectionAction).toBe('create');
        expect(options.imageColorInversion).toBe('disabled');
        expect(options.editorOptions).toEqual({
            grid: false,
            background: '#1e2227',
            restorePosition: false,
            sidebars: false,
            additionalPens: 3,
            disableDialogResize: false,
        });
    });

    it('imports legacy flat keys from old conf.json files', () => {
        const options = buildOptions({grid: false, restorePosition: false, background: '#1e1e1e'});
        expect(options.editorOptions.grid).toBe(false);
        expect(options.editorOptions.restorePosition).toBe(false);
        expect(options.editorOptions.background).toBe('#1e1e1e');
        expect(options.editorOptions.sidebars).toBe(true);
    });

    it('prefers nested keys over legacy flat keys within conf.json', () => {
        const options = buildOptions({grid: false, editorOptions: {grid: true}});
        expect(options.editorOptions.grid).toBe(true);
    });

    it('falls back to defaults for invalid values', () => {
        const options = buildOptions({
            noSelectionAction: 'bogus',
            imageColorInversion: 'bogus',
            editorOptions: {
                grid: 'yes',
                background: 'not-a-color',
                sidebars: 1,
                additionalPens: 99,
            },
        });
        expect(options.noSelectionAction).toBe('ask');
        expect(options.imageColorInversion).toBe('on-dark');
        expect(options.editorOptions.grid).toBe(true);
        expect(options.editorOptions.background).toBe('#ffffff');
        expect(options.editorOptions.sidebars).toBe(true);
        expect(options.editorOptions.additionalPens).toBe(0);
    });

    it('rejects invalid pen counts instead of coercing them', () => {
        for (const invalid of [-3, '5', 5.9, 8]) {
            const options = buildOptions({editorOptions: {additionalPens: invalid}});
            expect(options.editorOptions.additionalPens).toBe(0);
        }
        expect(buildOptions({editorOptions: {additionalPens: 7}}).editorOptions.additionalPens).toBe(7);
    });
});

describe('SETTINGS validators', () => {
    it('accepts every declared default value', () => {
        for (const definition of SETTINGS) {
            expect(definition.validate?.(definition.default, definition) ?? true, definition.path).toBe(true);
        }
    });

    it('rejects values that are not in options or outside slider bounds', () => {
        const select = SETTINGS.find(definition => definition.path === 'noSelectionAction');
        expect(select.validate('bogus', select)).toBe(false);
        expect(select.validate('create', select)).toBe(true);

        const slider = SETTINGS.find(definition => definition.path === 'editorOptions.additionalPens');
        expect(slider.validate(8, slider)).toBe(false);
        expect(slider.validate('5', slider)).toBe(false);
        expect(slider.validate(5, slider)).toBe(true);
    });
});

describe('path helpers', () => {
    it('reads and writes nested paths', () => {
        const target: any = {};
        setPath(target, 'editorOptions.grid', false);
        expect(getPath(target, 'editorOptions.grid')).toBe(false);
        expect(getPath(target, 'editorOptions.missing')).toBeUndefined();
        expect(getPath(null, 'editorOptions.grid')).toBeUndefined();
    });
});
