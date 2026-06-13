
# SiYuan js-draw Plugin

This plugin allows you to embed js-draw whiteboards anywhere in your SiYuan documents.

▶️ [LiuYun thread](https://liuyun.io/article/1770978310553)

## Features

- **Stylus support**: full stylus support, with pressure sensitivity.
- **Light/dark mode**: draw in light or dark mode, and have your drawings automatically adapt to your SiYuan theme.
- **Auto-save**: your drawing is saved automatically as you draw.
- **Optimized for multi-device**: edit on a device and sync to others with auto-refresh.
- **Fully customizable**: all the options you need in the plugin settings page.
- **And much more**: all the features of [js-draw](https://github.com/personalizedrefrigerator/js-draw) are available.

For the planned features, check out the [Projects](https://git.boxo.cc/massivebox/siyuan-jsdraw-plugin/projects) tab!

## Usage instructions
![Demo](asset/demo.webp)

Install the plugin from the marketplace by searching for `js-draw`.

### Creating a whiteboard

There are two ways to create a new whiteboard:
- **Slash command** — type `/Insert whiteboard` in your document and select the menu entry.
- **Keyboard shortcut / toolbar icon** — press `Alt+Shift+D` or click the toolbar icon without selecting anything. A new whiteboard will be inserted at your cursor position.

The editor will open in a new tab (or dialog on mobile). Draw what you like, then click **Save** and close the editor.

### Editing a whiteboard

Select an existing whiteboard by left-clicking it, then open the editor in one of these ways:
- Press `Alt+Shift+D` or click the toolbar icon.
- Right-click the whiteboard (or tap the three dots on mobile) and choose **Plugin → Edit whiteboard**.

## Contributing
Contributions are always welcome!  
The Chinese translation is made by AI, and I'm unable to thorougly verify it because I don't speak Chinese. If you do and find issues, please let me know.  
Please [open an issue](https://git.boxo.cc/massivebox/siyuan-jsdraw-plugin/issues) or [contact me](mailto:box@boxo.cc) if you'd like to help!

## Thanks to
This project couldn't have been possible without (in no particular order):
- The [SiYuan](https://github.com/siyuan-note/siyuan) project
- [js-draw](https://github.com/personalizedrefrigerator/js-draw)
- [SiYuan plugin sample with vite and svelte](https://github.com/siyuan-note/plugin-sample-vite-svelte)
- [siyuan-drawio-plugin](https://github.com/zt8989/siyuan-drawio-plugin) and
  [siyuan-plugin-whiteboard](https://github.com/zuoez02/siyuan-plugin-whiteboard) for inspiration and bits of code

Make sure you check them out and support them as well!

## License
The original plugin framework is developed by SiYuan 思源笔记 and licensed under the MIT license.  
All changes made by me are copyright MassiveBox 2025, and licensed under the MIT license.