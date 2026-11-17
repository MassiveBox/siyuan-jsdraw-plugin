import { resolve } from 'path';
import { defineConfig } from 'vitest/config';

// Separate from vite.config.ts: tests must not run the i18n build plugin or
// bundle the SiYuan plugin entry point.
export default defineConfig({
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src'),
        },
    },
    test: {
        environment: 'node',
        include: ['src/**/*.test.ts'],
    },
});
