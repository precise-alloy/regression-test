import fs from 'fs';
import packageInfo from './package.json';
const version = process.env.CURRENT_VERSION || packageInfo.version;
// parse version to major, minor, patch
const versionParts = version.split('.').map(function (part) {
  return parseInt(part);
});
// increment minor version
versionParts[1]++;
versionParts[2] = 0;
// save new version
const newVersion = versionParts.join('.');
packageInfo.version = newVersion;

fs.writeFileSync('package.json', JSON.stringify(packageInfo, null, 2), 'utf-8');

console.log(`Version updated to ${newVersion}`);
