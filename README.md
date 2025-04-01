
# SiYuan js-draw Plugin

This plugin allows you to embed js-draw whiteboards anywhere in your SiYuan documents.  

## Usage instructions
- Install the plugin from the marketplace. You can find it by searching for `js-draw`.
- To edit an SVG image that is already embedded in your document:
  1. Right-click on the image, select "Plugin" > "Edit with js-draw" in the menu
  2. The editor tab will open, edit your file as you like, then click the Save button and close the tab.
  3. The image is updated, but SiYuan will still show the cached (old) image. This will be fixed in future releases, 
     please be patient. Until them, you can refresh the editor or change the image path.
- To add a new drawing to your document:
  1. Type `/Insert Drawing` in your document, and select the correct menu entry
  2. The whiteboard editor will open in a new tab. Draw as you like, then click the Save button and close the tab.
  3. Click the Gear icon > Refresh to refresh the drawing block.
  4. Click the drawing block to open the editor again.

## Planned features
Check out the [Projects](https://git.massive.box/massivebox/siyuan-jsdraw-plugin/projects) tab!

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