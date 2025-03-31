
# SiYuan js-draw Plugin

This plugin allows you to embed js-draw whiteboards anywhere in your SiYuan documents.  

## Usage instructions
1. Install the plugin
   - Grab a release from the [Releases page](https://git.massive.box/massivebox/siyuan-jsdraw-plugin/releases)
   - Unzip it in the folder `./data/plugins`, relatively to your SiYuan workspace.
   > The plugin is not yet available in the official marketplace. I will try to publish it there soon!
2. Insert a drawing in your documents by typing `/Insert Drawing` in your document, and selecting the correct menu entry
3. The whiteboard editor will open in a new tab. Draw as you like, then click the Save button. It will also add a
   drawing block to your document.
4. Click the Gear icon > Refresh to refresh the drawing block, if it's still displaying the old drawing.
5. Click the drawing block to open the editor again.

## Planned features
- [ ] Auto-reload drawing blocks on drawing change
- [ ] Rename whiteboards
- [ ] Improve internationalization framework
- [ ] Default background color and grid options
- [ ] Respecting user theme for the editor
- And more!

## Contributing
Contributions are always welcome! Right now, I'm working on the core functionality and fixing bugs.
After that is done, I will need help with the internationalization, as, unfortunately, I don't speak Chinese.  
Please [contact me](mailto:box@massive.box) if you'd like to help!

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