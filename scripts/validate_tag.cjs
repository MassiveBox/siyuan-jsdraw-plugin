const fs = require('fs');
const path = require('path');

const [tagName] = process.argv.slice(2); // Get tag from CLI arguments
if (!tagName) {
  console.error('Error: No tag name provided.');
  process.exit(1);
}

const TAG_VERSION = tagName.replace('refs/tags/v', '');

try {
  const packageJson = JSON.parse(fs.readFileSync(path.resolve('package.json'), 'utf8'));
  const pluginJson = JSON.parse(fs.readFileSync(path.resolve('plugin.json'), 'utf8'));

  if (TAG_VERSION !== packageJson.version || TAG_VERSION !== pluginJson.version) {
    console.error(`Error: Tag version (${TAG_VERSION}) does not match package.json (${packageJson.version}) or plugin.json (${pluginJson.version})`);
    process.exit(1);
  }
  console.log('Tag version matches both JSON files.');
} catch (err) {
  console.error('Failed to read or parse JSON files:', err.message);
  process.exit(1);
}
