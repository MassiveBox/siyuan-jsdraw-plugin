import type { Plugin } from 'siyuan';
import {svelteDialog} from '@/libs/dialog';
import SettingsDialog from '@/libs/components/SettingsDialog.svelte';
import type { PluginConfig } from '@/config';
import {
    SETTINGS,
    getPath,
    setPath,
    validateColor,
    type SettingDefinition,
} from '@/config-schema';
import {ErrorReporter, InvalidBackgroundColorError} from '@/errors';
import {updateImageColorInversionStyle} from '@/theme';

type SettingsPlugin = Plugin & { config: PluginConfig };

interface Section {
    key: string;
    label: string;
    items: ISettingItem[];
}

/** Helper to show human-readable default value */
function formatDefault(definition: SettingDefinition, entry: any, ui: any): string {
    if (definition.type === 'checkbox') {
        return definition.default ? ui.on : ui.off;
    }
    if (definition.type === 'select') {
        const i18nKey = definition.options?.[definition.default];
        return entry?.options?.[i18nKey] ?? String(definition.default);
    }
    return String(definition.default);
}

/** Build item list for a group */
function buildItems(group: string, options: any, strings: any, ui: any): ISettingItem[] {
    return SETTINGS.filter(definition => definition.group === group).map(definition => {
        const entry = strings[definition.titleKey] ?? {};
        let selectOptions: Record<string, string> | undefined;
        if (definition.type === 'select' && definition.options) {
            selectOptions = Object.fromEntries(
                Object.entries(definition.options).map(([value, i18nKey]) =>
                    [value, entry.options?.[i18nKey] ?? value])
            );
        }
        const defaultText = formatDefault(definition, entry, ui);
        return {
            key: definition.path,
            type: definition.type,
            value: getPath(options, definition.path),
            defaultValue: definition.default,
            title: entry.title ?? definition.titleKey,
            description: `${entry.description ?? ''}<br /><span style="opacity: .7">${ui.default}: ${defaultText}</span>`,
            options: selectOptions,
            slider: definition.slider,
        } as ISettingItem;
    });
}

/** Open the plugin settings dialog. */
export function openSettingsDialog(plugin: SettingsPlugin): void {
    const strings: any = (plugin.i18n as any).settings;
    const ui = strings.ui;
    const suggestedColors: Record<string, string> = {
        '#00000000': strings.suggestedColors.transparent,
        'CUSTOM': strings.suggestedColors.custom,
        '#ffffff': strings.suggestedColors.white,
        '#1e2227': strings.suggestedColors.darkBlue,
        '#1e1e1e': strings.suggestedColors.darkGray,
        '#000000': strings.suggestedColors.black,
    };

    const sections: Section[] = [
        {key: 'general', label: ui.groups.general, items: buildItems('general', plugin.config.options, strings, ui)},
        {key: 'editor', label: ui.groups.editor, items: buildItems('editor', plugin.config.options, strings, ui)},
    ];
    const labels = {
        reset: ui.reset,
        resetTitle: ui.resetConfirmTitle,
        resetMessage: ui.resetConfirmMessage,
        cancel: window.siyuan.languages.cancel ?? 'Cancel',
        confirm: window.siyuan.languages.confirm ?? 'Save',
    };

    const {component, close} = svelteDialog({
        title: strings.name,
        width: '720px',
        constructor: (container) => new SettingsDialog({
            target: container,
            props: {sections, labels, suggestedColors},
        }),
    });

    component.$on('cancel', () => close());

    component.$on('confirm', (event: CustomEvent<{values: Record<string, any>}>) => {
        const values = event.detail.values;
        if (!validateColor(values['editorOptions.background'])) {
            ErrorReporter.error(new InvalidBackgroundColorError());
            return; // keep the dialog open so the user can correct the value
        }

        const options = {
            ...plugin.config.options,
            editorOptions: {...plugin.config.options.editorOptions},
        };
        for (const definition of SETTINGS) {
            if (definition.path in values) {
                setPath(options, definition.path, values[definition.path]);
            }
        }
        plugin.config.setOptions(options);

        void plugin.config.save()
            .then(() => {
                updateImageColorInversionStyle(options.imageColorInversion);
                close();
            })
            .catch(error => ErrorReporter.error(error));
    });
}
