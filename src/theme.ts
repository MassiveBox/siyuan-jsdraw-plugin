const LIGHT_THEME = `
    --background-color-1: white;
    --foreground-color-1: black;
    --background-color-2: #f5f5f5;
    --foreground-color-2: #2c303a;
    --background-color-3: #e5e5e5;
    --foreground-color-3: #1c202a;
    --selection-background-color: #cbdaf1;
    --selection-foreground-color: #2c303a;
    --background-color-transparent: rgba(105, 100, 100, 0.5);
    --shadow-color: rgba(0, 0, 0, 0.5);
    --primary-action-foreground-color: #15b;
`;

const DARK_THEME = `
    --background-color-1: #151515;
    --foreground-color-1: white;
    --background-color-2: #222;
    --foreground-color-2: #efefef;
    --background-color-3: #272627;
    --foreground-color-3: #eee;
    --selection-background-color: #003b75;
    --selection-foreground-color: white;
    --shadow-color: rgba(250, 250, 250, 0.5);
    --background-color-transparent: rgba(50, 50, 50, 0.5);
    --primary-action-foreground-color: #7ae;
`;

export function getSiYuanThemeCSS(): string | null {
    if (window.siyuan.config.appearance.modeOS) {
        return null;
    }
    const isDark = window.siyuan.config.appearance.mode === 1;
    const vars = isDark ? DARK_THEME : LIGHT_THEME;
    return `.imageEditorContainer { ${vars} }`;
}
