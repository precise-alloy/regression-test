import fs from 'fs';
import packageInfo from './package.json';

const version = process.env.CURRENT_VERSION || packageInfo.version;
// parse version to major, minor, patch
const versionParts = version.split('.').map(function (part) {
  return parseInt(part);
});

const args = process.argv.slice(2);

// if args contains `--minor`, increment minor and reset patch
if (args.includes('--minor')) {
  versionParts[1]++;
  versionParts[2] = 0;
} else {
  // increment patch version
  versionParts[2]++;
}

// save new version
const newVersion = versionParts.join('.');
packageInfo.version = newVersion;

fs.writeFileSync('package.json', JSON.stringify(packageInfo, null, 2), 'utf-8');

console.log(`Version updated to ${newVersion}`);
