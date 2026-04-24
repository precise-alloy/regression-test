import chalk from 'chalk';
import backstop from 'backstopjs';
import { getBackstopDirName, getLibraryPath } from './helpers.js';
import path from 'path';
import fs from 'fs';
import { getConfigs } from './config.js';
import { snapshot } from './snapshot.js';

const PATCH_START = '<!-- PATCH START -->';
const PATCH_END = '<!-- PATCH END -->';

const customStyle = `
${PATCH_START}
<style>
  [id^="test"] > div[display="true"] > p[display] {
    white-space: pre;
    overflow-x: auto;
  }
</style>
${PATCH_END}
`;

export function applyCustomStylePatch(html: string) {
  const patchStartIndex = html.indexOf(PATCH_START);
  const patchEndIndex = html.indexOf(PATCH_END);
  if (patchStartIndex >= 0 && patchEndIndex > patchStartIndex) {
    return html.replace(new RegExp(PATCH_START + '.*' + PATCH_END, 'gis'), customStyle);
  }

  return html.replace('</head>', customStyle + '</head>');
}

export async function regressifyProcess(command: 'approve' | 'reference' | 'test' | 'snapshot', args: string[]) {
  const backstopDirName = getBackstopDirName(args);
  patchCompare();

  const configs = getConfigs(args, backstopDirName);

  if (command === 'snapshot') {
    snapshot({ configs, backstopDirName });
    return;
  }

  for (const config of configs) {
    console.log(chalk.blue(`Running backstopjs command: ${command} for test suite: ${config.id}`));

    await backstop(command, { config })
      .then(() => {
        console.log(chalk.green(command.toUpperCase() + ' FINISHED SUCCESSFULLY'));
      })
      .catch(() => {
        console.log(chalk.red(command.toUpperCase() + ' FAILED'));
      });
  }
}

function patchCustomStyle(reportIndex: string) {
  let html = fs.readFileSync(reportIndex, 'utf-8');
  html = applyCustomStylePatch(html);
  fs.writeFileSync(reportIndex, html);
}

export function patchCompare() {
  const reportIndex = path.resolve(getLibraryPath(), 'node_modules/backstopjs/compare/output/index.html');
  const reportIndex2 = path.resolve(getLibraryPath(), '../backstopjs/compare/output/index.html');
  if (fs.existsSync(reportIndex)) {
    patchCustomStyle(reportIndex);
  } else if (fs.existsSync(reportIndex2)) {
    patchCustomStyle(reportIndex2);
  } else {
    console.log(chalk.red('File does not exist: ' + reportIndex));
  }
}
