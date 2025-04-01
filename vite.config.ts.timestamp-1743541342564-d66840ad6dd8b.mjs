// vite.config.ts
import { resolve as resolve2 } from "path";
import { defineConfig } from "file:///home/massive/Dev/siyuan-jsdraw-plugin/node_modules/vite/dist/node/index.js";
import { viteStaticCopy } from "file:///home/massive/Dev/siyuan-jsdraw-plugin/node_modules/vite-plugin-static-copy/dist/index.js";
import livereload from "file:///home/massive/Dev/siyuan-jsdraw-plugin/node_modules/rollup-plugin-livereload/dist/index.cjs.js";
import { svelte } from "file:///home/massive/Dev/siyuan-jsdraw-plugin/node_modules/@sveltejs/vite-plugin-svelte/src/index.js";
import zipPack from "file:///home/massive/Dev/siyuan-jsdraw-plugin/node_modules/vite-plugin-zip-pack/dist/esm/index.mjs";
import fg from "file:///home/massive/Dev/siyuan-jsdraw-plugin/node_modules/fast-glob/out/index.js";

// yaml-plugin.js
import fs from "fs";
import yaml from "file:///home/massive/Dev/siyuan-jsdraw-plugin/node_modules/js-yaml/dist/js-yaml.mjs";
import { resolve } from "path";
function vitePluginYamlI18n(options = {}) {
  const DefaultOptions = {
    inDir: "src/i18n",
    outDir: "dist/i18n"
  };
  const finalOptions = { ...DefaultOptions, ...options };
  return {
    name: "vite-plugin-yaml-i18n",
    buildStart() {
      console.log("\u{1F308} Parse I18n: YAML to JSON..");
      const inDir = finalOptions.inDir;
      const outDir = finalOptions.outDir;
      if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
      }
      const files = fs.readdirSync(inDir);
      for (const file of files) {
        if (file.endsWith(".yaml") || file.endsWith(".yml")) {
          console.log(`-- Parsing ${file}`);
          const jsonFile = file.replace(/\.(yaml|yml)$/, ".json");
          if (files.includes(jsonFile)) {
            console.log(`---- File ${jsonFile} already exists, skipping...`);
            continue;
          }
          try {
            const filePath = resolve(inDir, file);
            const fileContents = fs.readFileSync(filePath, "utf8");
            const parsed = yaml.load(fileContents);
            const jsonContent = JSON.stringify(parsed, null, 2);
            const outputFilePath = resolve(outDir, file.replace(/\.(yaml|yml)$/, ".json"));
            console.log(`---- Writing to ${outputFilePath}`);
            fs.writeFileSync(outputFilePath, jsonContent);
          } catch (error) {
            this.error(`---- Error parsing YAML file ${file}: ${error.message}`);
          }
        }
      }
    }
  };
}

// vite.config.ts
var __vite_injected_original_dirname = "/home/massive/Dev/siyuan-jsdraw-plugin";
var env = process.env;
var isSrcmap = env.VITE_SOURCEMAP === "inline";
var isDev = env.NODE_ENV === "development";
var outputDir = isDev ? "dev" : "dist";
console.log("isDev=>", isDev);
console.log("isSrcmap=>", isSrcmap);
console.log("outputDir=>", outputDir);
var vite_config_default = defineConfig({
  resolve: {
    alias: {
      "@": resolve2(__vite_injected_original_dirname, "src")
    }
  },
  plugins: [
    svelte(),
    vitePluginYamlI18n({
      inDir: "public/i18n",
      outDir: `${outputDir}/i18n`
    }),
    viteStaticCopy({
      targets: [
        { src: "./README*.md", dest: "./" },
        { src: "./plugin.json", dest: "./" },
        { src: "./preview.png", dest: "./" },
        { src: "./icon.png", dest: "./" }
      ]
    })
  ],
  define: {
    "process.env.DEV_MODE": JSON.stringify(isDev),
    "process.env.NODE_ENV": JSON.stringify(env.NODE_ENV)
  },
  build: {
    outDir: outputDir,
    emptyOutDir: false,
    minify: true,
    sourcemap: isSrcmap ? "inline" : false,
    lib: {
      entry: resolve2(__vite_injected_original_dirname, "src/index.ts"),
      fileName: "index",
      formats: ["cjs"]
    },
    rollupOptions: {
      plugins: [
        ...isDev ? [
          livereload(outputDir),
          {
            name: "watch-external",
            async buildStart() {
              const files = await fg([
                "public/i18n/**",
                "./README*.md",
                "./plugin.json"
              ]);
              for (let file of files) {
                this.addWatchFile(file);
              }
            }
          }
        ] : [
          // Clean up unnecessary files under dist dir
          cleanupDistFiles({
            patterns: ["i18n/*.yaml", "i18n/*.md"],
            distDir: outputDir
          }),
          zipPack({
            inDir: "./dist",
            outDir: "./",
            outFileName: "package.zip"
          })
        ]
      ],
      external: ["siyuan", "process"],
      output: {
        entryFileNames: "[name].js",
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === "style.css") {
            return "index.css";
          }
          return assetInfo.name;
        }
      }
    }
  }
});
function cleanupDistFiles(options) {
  const {
    patterns,
    distDir
  } = options;
  return {
    name: "rollup-plugin-cleanup",
    enforce: "post",
    writeBundle: {
      sequential: true,
      order: "post",
      async handler() {
        const fg2 = await import("file:///home/massive/Dev/siyuan-jsdraw-plugin/node_modules/fast-glob/out/index.js");
        const fs2 = await import("fs");
        const distPatterns = patterns.map((pat) => `${distDir}/${pat}`);
        console.debug("Cleanup searching patterns:", distPatterns);
        const files = await fg2.default(distPatterns, {
          dot: true,
          absolute: true,
          onlyFiles: false
        });
        for (const file of files) {
          try {
            if (fs2.default.existsSync(file)) {
              const stat = fs2.default.statSync(file);
              if (stat.isDirectory()) {
                fs2.default.rmSync(file, { recursive: true });
              } else {
                fs2.default.unlinkSync(file);
              }
              console.log(`Cleaned up: ${file}`);
            }
          } catch (error) {
            console.error(`Failed to clean up ${file}:`, error);
          }
        }
      }
    }
  };
}
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiLCAieWFtbC1wbHVnaW4uanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9tYXNzaXZlL0Rldi9zaXl1YW4tanNkcmF3LXBsdWdpblwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL2hvbWUvbWFzc2l2ZS9EZXYvc2l5dWFuLWpzZHJhdy1wbHVnaW4vdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL2hvbWUvbWFzc2l2ZS9EZXYvc2l5dWFuLWpzZHJhdy1wbHVnaW4vdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyByZXNvbHZlIH0gZnJvbSBcInBhdGhcIlxuaW1wb3J0IHsgZGVmaW5lQ29uZmlnLCBsb2FkRW52IH0gZnJvbSBcInZpdGVcIlxuaW1wb3J0IHsgdml0ZVN0YXRpY0NvcHkgfSBmcm9tIFwidml0ZS1wbHVnaW4tc3RhdGljLWNvcHlcIlxuaW1wb3J0IGxpdmVyZWxvYWQgZnJvbSBcInJvbGx1cC1wbHVnaW4tbGl2ZXJlbG9hZFwiXG5pbXBvcnQgeyBzdmVsdGUgfSBmcm9tIFwiQHN2ZWx0ZWpzL3ZpdGUtcGx1Z2luLXN2ZWx0ZVwiXG5pbXBvcnQgemlwUGFjayBmcm9tIFwidml0ZS1wbHVnaW4temlwLXBhY2tcIjtcbmltcG9ydCBmZyBmcm9tICdmYXN0LWdsb2InO1xuXG5pbXBvcnQgdml0ZVBsdWdpbllhbWxJMThuIGZyb20gJy4veWFtbC1wbHVnaW4nO1xuXG5jb25zdCBlbnYgPSBwcm9jZXNzLmVudjtcbmNvbnN0IGlzU3JjbWFwID0gZW52LlZJVEVfU09VUkNFTUFQID09PSAnaW5saW5lJztcbmNvbnN0IGlzRGV2ID0gZW52Lk5PREVfRU5WID09PSAnZGV2ZWxvcG1lbnQnO1xuXG5jb25zdCBvdXRwdXREaXIgPSBpc0RldiA/IFwiZGV2XCIgOiBcImRpc3RcIjtcblxuY29uc29sZS5sb2coXCJpc0Rldj0+XCIsIGlzRGV2KTtcbmNvbnNvbGUubG9nKFwiaXNTcmNtYXA9PlwiLCBpc1NyY21hcCk7XG5jb25zb2xlLmxvZyhcIm91dHB1dERpcj0+XCIsIG91dHB1dERpcik7XG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gICAgcmVzb2x2ZToge1xuICAgICAgICBhbGlhczoge1xuICAgICAgICAgICAgXCJAXCI6IHJlc29sdmUoX19kaXJuYW1lLCBcInNyY1wiKSxcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBwbHVnaW5zOiBbXG4gICAgICAgIHN2ZWx0ZSgpLFxuXG4gICAgICAgIHZpdGVQbHVnaW5ZYW1sSTE4bih7XG4gICAgICAgICAgICBpbkRpcjogJ3B1YmxpYy9pMThuJyxcbiAgICAgICAgICAgIG91dERpcjogYCR7b3V0cHV0RGlyfS9pMThuYFxuICAgICAgICB9KSxcblxuICAgICAgICB2aXRlU3RhdGljQ29weSh7XG4gICAgICAgICAgICB0YXJnZXRzOiBbXG4gICAgICAgICAgICAgICAgeyBzcmM6IFwiLi9SRUFETUUqLm1kXCIsIGRlc3Q6IFwiLi9cIiB9LFxuICAgICAgICAgICAgICAgIHsgc3JjOiBcIi4vcGx1Z2luLmpzb25cIiwgZGVzdDogXCIuL1wiIH0sXG4gICAgICAgICAgICAgICAgeyBzcmM6IFwiLi9wcmV2aWV3LnBuZ1wiLCBkZXN0OiBcIi4vXCIgfSxcbiAgICAgICAgICAgICAgICB7IHNyYzogXCIuL2ljb24ucG5nXCIsIGRlc3Q6IFwiLi9cIiB9XG4gICAgICAgICAgICBdLFxuICAgICAgICB9KSxcblxuICAgIF0sXG5cbiAgICBkZWZpbmU6IHtcbiAgICAgICAgXCJwcm9jZXNzLmVudi5ERVZfTU9ERVwiOiBKU09OLnN0cmluZ2lmeShpc0RldiksXG4gICAgICAgIFwicHJvY2Vzcy5lbnYuTk9ERV9FTlZcIjogSlNPTi5zdHJpbmdpZnkoZW52Lk5PREVfRU5WKVxuICAgIH0sXG5cbiAgICBidWlsZDoge1xuICAgICAgICBvdXREaXI6IG91dHB1dERpcixcbiAgICAgICAgZW1wdHlPdXREaXI6IGZhbHNlLFxuICAgICAgICBtaW5pZnk6IHRydWUsXG4gICAgICAgIHNvdXJjZW1hcDogaXNTcmNtYXAgPyAnaW5saW5lJyA6IGZhbHNlLFxuXG4gICAgICAgIGxpYjoge1xuICAgICAgICAgICAgZW50cnk6IHJlc29sdmUoX19kaXJuYW1lLCBcInNyYy9pbmRleC50c1wiKSxcbiAgICAgICAgICAgIGZpbGVOYW1lOiBcImluZGV4XCIsXG4gICAgICAgICAgICBmb3JtYXRzOiBbXCJjanNcIl0sXG4gICAgICAgIH0sXG4gICAgICAgIHJvbGx1cE9wdGlvbnM6IHtcbiAgICAgICAgICAgIHBsdWdpbnM6IFtcbiAgICAgICAgICAgICAgICAuLi4oaXNEZXYgPyBbXG4gICAgICAgICAgICAgICAgICAgIGxpdmVyZWxvYWQob3V0cHV0RGlyKSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogJ3dhdGNoLWV4dGVybmFsJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGFzeW5jIGJ1aWxkU3RhcnQoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZmlsZXMgPSBhd2FpdCBmZyhbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICdwdWJsaWMvaTE4bi8qKicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICcuL1JFQURNRSoubWQnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnLi9wbHVnaW4uanNvbidcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBmaWxlIG9mIGZpbGVzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuYWRkV2F0Y2hGaWxlKGZpbGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIF0gOiBbXG4gICAgICAgICAgICAgICAgICAgIC8vIENsZWFuIHVwIHVubmVjZXNzYXJ5IGZpbGVzIHVuZGVyIGRpc3QgZGlyXG4gICAgICAgICAgICAgICAgICAgIGNsZWFudXBEaXN0RmlsZXMoe1xuICAgICAgICAgICAgICAgICAgICAgICAgcGF0dGVybnM6IFsnaTE4bi8qLnlhbWwnLCAnaTE4bi8qLm1kJ10sXG4gICAgICAgICAgICAgICAgICAgICAgICBkaXN0RGlyOiBvdXRwdXREaXJcbiAgICAgICAgICAgICAgICAgICAgfSksXG4gICAgICAgICAgICAgICAgICAgIHppcFBhY2soe1xuICAgICAgICAgICAgICAgICAgICAgICAgaW5EaXI6ICcuL2Rpc3QnLFxuICAgICAgICAgICAgICAgICAgICAgICAgb3V0RGlyOiAnLi8nLFxuICAgICAgICAgICAgICAgICAgICAgICAgb3V0RmlsZU5hbWU6ICdwYWNrYWdlLnppcCdcbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICBdKVxuICAgICAgICAgICAgXSxcblxuICAgICAgICAgICAgZXh0ZXJuYWw6IFtcInNpeXVhblwiLCBcInByb2Nlc3NcIl0sXG5cbiAgICAgICAgICAgIG91dHB1dDoge1xuICAgICAgICAgICAgICAgIGVudHJ5RmlsZU5hbWVzOiBcIltuYW1lXS5qc1wiLFxuICAgICAgICAgICAgICAgIGFzc2V0RmlsZU5hbWVzOiAoYXNzZXRJbmZvKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChhc3NldEluZm8ubmFtZSA9PT0gXCJzdHlsZS5jc3NcIikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFwiaW5kZXguY3NzXCJcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXNzZXRJbmZvLm5hbWVcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICB9XG59KTtcblxuXG4vKipcbiAqIENsZWFuIHVwIHNvbWUgZGlzdCBmaWxlcyBhZnRlciBjb21waWxlZFxuICogQGF1dGhvciBmcm9zdGltZVxuICogQHBhcmFtIG9wdGlvbnM6XG4gKiBAcmV0dXJucyBcbiAqL1xuZnVuY3Rpb24gY2xlYW51cERpc3RGaWxlcyhvcHRpb25zOiB7IHBhdHRlcm5zOiBzdHJpbmdbXSwgZGlzdERpcjogc3RyaW5nIH0pIHtcbiAgICBjb25zdCB7XG4gICAgICAgIHBhdHRlcm5zLFxuICAgICAgICBkaXN0RGlyXG4gICAgfSA9IG9wdGlvbnM7XG5cbiAgICByZXR1cm4ge1xuICAgICAgICBuYW1lOiAncm9sbHVwLXBsdWdpbi1jbGVhbnVwJyxcbiAgICAgICAgZW5mb3JjZTogJ3Bvc3QnLFxuICAgICAgICB3cml0ZUJ1bmRsZToge1xuICAgICAgICAgICAgc2VxdWVudGlhbDogdHJ1ZSxcbiAgICAgICAgICAgIG9yZGVyOiAncG9zdCcgYXMgJ3Bvc3QnLFxuICAgICAgICAgICAgYXN5bmMgaGFuZGxlcigpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBmZyA9IGF3YWl0IGltcG9ydCgnZmFzdC1nbG9iJyk7XG4gICAgICAgICAgICAgICAgY29uc3QgZnMgPSBhd2FpdCBpbXBvcnQoJ2ZzJyk7XG4gICAgICAgICAgICAgICAgLy8gY29uc3QgcGF0aCA9IGF3YWl0IGltcG9ydCgncGF0aCcpO1xuXG4gICAgICAgICAgICAgICAgLy8gXHU0RjdGXHU3NTI4IGdsb2IgXHU4QkVEXHU2Q0Q1XHVGRjBDXHU3ODZFXHU0RkREXHU4MEZEXHU1MzM5XHU5MTREXHU1MjMwXHU2NTg3XHU0RUY2XG4gICAgICAgICAgICAgICAgY29uc3QgZGlzdFBhdHRlcm5zID0gcGF0dGVybnMubWFwKHBhdCA9PiBgJHtkaXN0RGlyfS8ke3BhdH1gKTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmRlYnVnKCdDbGVhbnVwIHNlYXJjaGluZyBwYXR0ZXJuczonLCBkaXN0UGF0dGVybnMpO1xuXG4gICAgICAgICAgICAgICAgY29uc3QgZmlsZXMgPSBhd2FpdCBmZy5kZWZhdWx0KGRpc3RQYXR0ZXJucywge1xuICAgICAgICAgICAgICAgICAgICBkb3Q6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIGFic29sdXRlOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBvbmx5RmlsZXM6IGZhbHNlXG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmluZm8oJ0ZpbGVzIHRvIGJlIGNsZWFuZWQgdXA6JywgZmlsZXMpO1xuXG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBmaWxlIG9mIGZpbGVzKSB7XG4gICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZnMuZGVmYXVsdC5leGlzdHNTeW5jKGZpbGUpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgc3RhdCA9IGZzLmRlZmF1bHQuc3RhdFN5bmMoZmlsZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHN0YXQuaXNEaXJlY3RvcnkoKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmcy5kZWZhdWx0LnJtU3luYyhmaWxlLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmcy5kZWZhdWx0LnVubGlua1N5bmMoZmlsZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBDbGVhbmVkIHVwOiAke2ZpbGV9YCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGBGYWlsZWQgdG8gY2xlYW4gdXAgJHtmaWxlfTpgLCBlcnJvcik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xufVxuIiwgImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9tYXNzaXZlL0Rldi9zaXl1YW4tanNkcmF3LXBsdWdpblwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL2hvbWUvbWFzc2l2ZS9EZXYvc2l5dWFuLWpzZHJhdy1wbHVnaW4veWFtbC1wbHVnaW4uanNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL2hvbWUvbWFzc2l2ZS9EZXYvc2l5dWFuLWpzZHJhdy1wbHVnaW4veWFtbC1wbHVnaW4uanNcIjsvKlxuICogQ29weXJpZ2h0IChjKSAyMDI0IGJ5IGZyb3N0aW1lLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICogQEF1dGhvciAgICAgICA6IGZyb3N0aW1lXG4gKiBARGF0ZSAgICAgICAgIDogMjAyNC0wNC0wNSAyMToyNzo1NVxuICogQEZpbGVQYXRoICAgICA6IC95YW1sLXBsdWdpbi5qc1xuICogQExhc3RFZGl0VGltZSA6IDIwMjQtMDQtMDUgMjI6NTM6MzRcbiAqIEBEZXNjcmlwdGlvbiAgOiBcdTUzQkJcdTU5QUVcdTczOUJcdTc2ODQganNvbiBcdTY4M0NcdTVGMEZcdUZGMENcdTYyMTFcdTVDMzFcdTY2MkZcdTg5ODFcdTc1MjggeWFtbCBcdTUxOTkgaTE4blxuICovXG4vLyBwbHVnaW5zL3ZpdGUtcGx1Z2luLXBhcnNlLXlhbWwuanNcbmltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQgeWFtbCBmcm9tICdqcy15YW1sJztcbmltcG9ydCB7IHJlc29sdmUgfSBmcm9tICdwYXRoJztcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gdml0ZVBsdWdpbllhbWxJMThuKG9wdGlvbnMgPSB7fSkge1xuICAgIC8vIERlZmF1bHQgb3B0aW9ucyB3aXRoIGEgZmFsbGJhY2tcbiAgICBjb25zdCBEZWZhdWx0T3B0aW9ucyA9IHtcbiAgICAgICAgaW5EaXI6ICdzcmMvaTE4bicsXG4gICAgICAgIG91dERpcjogJ2Rpc3QvaTE4bicsXG4gICAgfTtcblxuICAgIGNvbnN0IGZpbmFsT3B0aW9ucyA9IHsgLi4uRGVmYXVsdE9wdGlvbnMsIC4uLm9wdGlvbnMgfTtcblxuICAgIHJldHVybiB7XG4gICAgICAgIG5hbWU6ICd2aXRlLXBsdWdpbi15YW1sLWkxOG4nLFxuICAgICAgICBidWlsZFN0YXJ0KCkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ1x1RDgzQ1x1REYwOCBQYXJzZSBJMThuOiBZQU1MIHRvIEpTT04uLicpO1xuICAgICAgICAgICAgY29uc3QgaW5EaXIgPSBmaW5hbE9wdGlvbnMuaW5EaXI7XG4gICAgICAgICAgICBjb25zdCBvdXREaXIgPSBmaW5hbE9wdGlvbnMub3V0RGlyXG5cbiAgICAgICAgICAgIGlmICghZnMuZXhpc3RzU3luYyhvdXREaXIpKSB7XG4gICAgICAgICAgICAgICAgZnMubWtkaXJTeW5jKG91dERpciwgeyByZWN1cnNpdmU6IHRydWUgfSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vUGFyc2UgeWFtbCBmaWxlLCBvdXRwdXQgdG8ganNvblxuICAgICAgICAgICAgY29uc3QgZmlsZXMgPSBmcy5yZWFkZGlyU3luYyhpbkRpcik7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGZpbGUgb2YgZmlsZXMpIHtcbiAgICAgICAgICAgICAgICBpZiAoZmlsZS5lbmRzV2l0aCgnLnlhbWwnKSB8fCBmaWxlLmVuZHNXaXRoKCcueW1sJykpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYC0tIFBhcnNpbmcgJHtmaWxlfWApXG4gICAgICAgICAgICAgICAgICAgIC8vXHU2OEMwXHU2N0U1XHU2NjJGXHU1NDI2XHU2NzA5XHU1NDBDXHU1NDBEXHU3Njg0anNvblx1NjU4N1x1NEVGNlxuICAgICAgICAgICAgICAgICAgICBjb25zdCBqc29uRmlsZSA9IGZpbGUucmVwbGFjZSgvXFwuKHlhbWx8eW1sKSQvLCAnLmpzb24nKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGZpbGVzLmluY2x1ZGVzKGpzb25GaWxlKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYC0tLS0gRmlsZSAke2pzb25GaWxlfSBhbHJlYWR5IGV4aXN0cywgc2tpcHBpbmcuLi5gKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBmaWxlUGF0aCA9IHJlc29sdmUoaW5EaXIsIGZpbGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZmlsZUNvbnRlbnRzID0gZnMucmVhZEZpbGVTeW5jKGZpbGVQYXRoLCAndXRmOCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcGFyc2VkID0geWFtbC5sb2FkKGZpbGVDb250ZW50cyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBqc29uQ29udGVudCA9IEpTT04uc3RyaW5naWZ5KHBhcnNlZCwgbnVsbCwgMik7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBvdXRwdXRGaWxlUGF0aCA9IHJlc29sdmUob3V0RGlyLCBmaWxlLnJlcGxhY2UoL1xcLih5YW1sfHltbCkkLywgJy5qc29uJykpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYC0tLS0gV3JpdGluZyB0byAke291dHB1dEZpbGVQYXRofWApO1xuICAgICAgICAgICAgICAgICAgICAgICAgZnMud3JpdGVGaWxlU3luYyhvdXRwdXRGaWxlUGF0aCwganNvbkNvbnRlbnQpO1xuICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5lcnJvcihgLS0tLSBFcnJvciBwYXJzaW5nIFlBTUwgZmlsZSAke2ZpbGV9OiAke2Vycm9yLm1lc3NhZ2V9YCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgfTtcbn1cbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBb1MsU0FBUyxXQUFBQSxnQkFBZTtBQUM1VCxTQUFTLG9CQUE2QjtBQUN0QyxTQUFTLHNCQUFzQjtBQUMvQixPQUFPLGdCQUFnQjtBQUN2QixTQUFTLGNBQWM7QUFDdkIsT0FBTyxhQUFhO0FBQ3BCLE9BQU8sUUFBUTs7O0FDR2YsT0FBTyxRQUFRO0FBQ2YsT0FBTyxVQUFVO0FBQ2pCLFNBQVMsZUFBZTtBQUVULFNBQVIsbUJBQW9DLFVBQVUsQ0FBQyxHQUFHO0FBRXJELFFBQU0saUJBQWlCO0FBQUEsSUFDbkIsT0FBTztBQUFBLElBQ1AsUUFBUTtBQUFBLEVBQ1o7QUFFQSxRQUFNLGVBQWUsRUFBRSxHQUFHLGdCQUFnQixHQUFHLFFBQVE7QUFFckQsU0FBTztBQUFBLElBQ0gsTUFBTTtBQUFBLElBQ04sYUFBYTtBQUNULGNBQVEsSUFBSSxzQ0FBK0I7QUFDM0MsWUFBTSxRQUFRLGFBQWE7QUFDM0IsWUFBTSxTQUFTLGFBQWE7QUFFNUIsVUFBSSxDQUFDLEdBQUcsV0FBVyxNQUFNLEdBQUc7QUFDeEIsV0FBRyxVQUFVLFFBQVEsRUFBRSxXQUFXLEtBQUssQ0FBQztBQUFBLE1BQzVDO0FBR0EsWUFBTSxRQUFRLEdBQUcsWUFBWSxLQUFLO0FBQ2xDLGlCQUFXLFFBQVEsT0FBTztBQUN0QixZQUFJLEtBQUssU0FBUyxPQUFPLEtBQUssS0FBSyxT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QSxZQUNyQyxTQUFTO0FBQUEsVUFDYixDQUFDO0FBQUEsVUFDRCxRQUFRO0FBQUEsWUFDSixPQUFPO0FBQUEsWUFDUCxRQUFRO0FBQUEsWUFDUixhQUFhO0FBQUEsVUFDakIsQ0FBQztBQUFBLFFBQ0w7QUFBQSxNQUNKO0FBQUEsTUFFQSxVQUFVLENBQUMsVUFBVSxTQUFTO0FBQUEsTUFFOUIsUUFBUTtBQUFBLFFBQ0osZ0JBQWdCO0FBQUEsUUFDaEIsZ0JBQWdCLENBQUMsY0FBYztBQUMzQixjQUFJLFVBQVUsU0FBUyxhQUFhO0FBQ2hDLG1CQUFPO0FBQUEsVUFDWDtBQUNBLGlCQUFPLFVBQVU7QUFBQSxRQUNyQjtBQUFBLE1BQ0o7QUFBQSxJQUNKO0FBQUEsRUFDSjtBQUNKLENBQUM7QUFTRCxTQUFTLGlCQUFpQixTQUFrRDtBQUN4RSxRQUFNO0FBQUEsSUFDRjtBQUFBLElBQ0E7QUFBQSxFQUNKLElBQUk7QUFFSixTQUFPO0FBQUEsSUFDSCxNQUFNO0FBQUEsSUFDTixTQUFTO0FBQUEsSUFDVCxhQUFhO0FBQUEsTUFDVCxZQUFZO0FBQUEsTUFDWixPQUFPO0FBQUEsTUFDUCxNQUFNLFVBQVU7QUFDWixjQUFNQyxNQUFLLE1BQU0sT0FBTyxtRkFBVztBQUNuQyxjQUFNQyxNQUFLLE1BQU0sT0FBTyxJQUFJO0FBSTVCLGNBQU0sZUFBZSxTQUFTLElBQUksU0FBTyxHQUFHLE9BQU8sSUFBSSxHQUFHLEVBQUU7QUFDNUQsZ0JBQVEsTUFBTSwrQkFBK0IsWUFBWTtBQUV6RCxjQUFNLFFBQVEsTUFBTUQsSUFBRyxRQUFRLGNBQWM7QUFBQSxVQUN6QyxLQUFLO0FBQUEsVUFDTCxVQUFVO0FBQUEsVUFDVixXQUFXO0FBQUEsUUFDZixDQUFDO0FBSUQsbUJBQVcsUUFBUSxPQUFPO0FBQ3RCLGNBQUk7QUFDQSxnQkFBSUMsSUFBRyxRQUFRLFdBQVcsSUFBSSxHQUFHO0FBQzdCLG9CQUFNLE9BQU9BLElBQUcsUUFBUSxTQUFTLElBQUk7QUFDckMsa0JBQUksS0FBSyxZQUFZLEdBQUc7QUFDcEIsZ0JBQUFBLElBQUcsUUFBUSxPQUFPLE1BQU0sRUFBRSxXQUFXLEtBQUssQ0FBQztBQUFBLGNBQy9DLE9BQU87QUFDSCxnQkFBQUEsSUFBRyxRQUFRLFdBQVcsSUFBSTtBQUFBLGNBQzlCO0FBQ0Esc0JBQVEsSUFBSSxlQUFlLElBQUksRUFBRTtBQUFBLFlBQ3JDO0FBQUEsVUFDSixTQUFTLE9BQU87QUFDWixvQkFBUSxNQUFNLHNCQUFzQixJQUFJLEtBQUssS0FBSztBQUFBLFVBQ3REO0FBQUEsUUFDSjtBQUFBLE1BQ0o7QUFBQSxJQUNKO0FBQUEsRUFDSjtBQUNKOyIsCiAgIm5hbWVzIjogWyJyZXNvbHZlIiwgInJlc29sdmUiLCAiZmciLCAiZnMiXQp9Cg==
