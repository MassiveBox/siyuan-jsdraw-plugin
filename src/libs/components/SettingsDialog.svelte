<!--
    Dialog-based settings panel. Items are generated from `config-schema.ts`
-->
<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { confirmDialog } from '@/libs/dialog';
    import Form from './Form';

    export let sections: Array<{ key: string; label: string; items: ISettingItem[] }> = [];
    export let labels: {
        reset: string;
        resetTitle: string;
        resetMessage: string;
        cancel: string;
        confirm: string;
    };
    export let suggestedColors: Record<string, string> = {};

    const dispatch = createEventDispatcher();

    // The hex value is the value that gets saved. The dropdown is derived from
    // it on load/reset.
    let colorChoices: Record<string, string> = {};
    $: syncColorChoices(sections);

    function syncColorChoices(currentSections: typeof sections) {
        const next: Record<string, string> = {};
        for (const section of currentSections) {
            for (const item of section.items) {
                if (item.type !== 'color') continue;
                next[item.key] = item.value in suggestedColors ? item.value : 'CUSTOM';
            }
        }
        colorChoices = next;
    }

    function onColorSelect(item: ISettingItem, event: Event) {
        const selected = (event.currentTarget as HTMLSelectElement).value;
        if (selected !== 'CUSTOM') {
            item.value = selected;
            // Refresh the hex input (bound to item.value) and re-derive the
            // dropdown from the new value.
            sections = sections;
        } else {
            // Keep "Custom" selected.
            colorChoices = {...colorChoices, [item.key]: 'CUSTOM'};
        }
    }

    function onColorInput(item: ISettingItem) {
        const choice = item.value in suggestedColors ? item.value : 'CUSTOM';
        if (colorChoices[item.key] !== choice) {
            colorChoices = {...colorChoices, [item.key]: choice};
        }
    }

    function requestReset() {
        confirmDialog({
            title: labels.resetTitle,
            content: labels.resetMessage,
            confirm: applyDefaults,
        });
    }

    function applyDefaults() {
        for (const section of sections) {
            for (const item of section.items) {
                item.value = item.defaultValue;
            }
        }
        sections = sections;
    }

    function collectValues(): Record<string, any> {
        const values: Record<string, any> = {};
        for (const section of sections) {
            for (const item of section.items) {
                values[item.key] = item.value;
            }
        }
        return values;
    }
</script>

<div class="jsdraw-settings" style="display: flex; flex-direction: column; height: 100%;">
    <div class="b3-dialog__content" style="flex: 1; max-height: 70vh; overflow-y: auto;">
        {#each sections as section (section.key)}
            <div class="config__tab-container">
                <h3 style="margin: 12px 0 8px;">{section.label}</h3>
                {#each section.items as item (item.key)}
                    <Form.Wrap title={item.title} description={item.description} direction={item?.direction}>
                        <div class="fn__flex" style="gap: 8px; align-items: center; flex-wrap: wrap;">
                            {#if item.type === 'color'}
                                <select
                                    class="b3-select fn__size200"
                                    bind:value={colorChoices[item.key]}
                                    on:change={(event) => onColorSelect(item, event)}
                                >
                                    {#each Object.entries(suggestedColors) as [value, text]}
                                        <option {value}>{text}</option>
                                    {/each}
                                </select>
                                <input
                                    class="b3-text-field fn__size200"
                                    bind:value={item.value}
                                    on:input={() => onColorInput(item)}
                                    placeholder="#ffffff"
                                />
                            {:else}
                                <Form.Input
                                    type={item.type}
                                    key={item.key}
                                    bind:value={item.value}
                                    options={item?.options}
                                    slider={item?.slider}
                                />
                            {/if}
                        </div>
                    </Form.Wrap>
                {/each}
            </div>
        {/each}
    </div>
    <div class="b3-dialog__action">
        <button class="b3-button b3-button--cancel" on:click={requestReset}>{labels.reset}</button>
        <div class="fn__space"></div>
        <button class="b3-button b3-button--cancel" on:click={() => dispatch('cancel')}>{labels.cancel}</button>
        <div class="fn__space"></div>
        <button class="b3-button b3-button--text" on:click={() => dispatch('confirm', {values: collectValues()})}>{labels.confirm}</button>
    </div>
</div>
