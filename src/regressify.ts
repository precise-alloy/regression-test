import chalk from 'chalk';
import backstop from 'backstopjs';
import { getLibraryPath } from './helpers.js';
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

export async function regressifyProcess(command: 'approve' | 'reference' | 'test' | 'snapshot', args: string[]) {
  patchCompare();

  const configs = getConfigs(args);

  if (command === 'snapshot') {
    await snapshot(configs);
    return;
  }

  configs.forEach(async (config) => {
    await backstop(command, { config })
      .then(() => {
        console.log(chalk.green(command.toUpperCase() + ' FINISHED SUCCESSFULLY'));
      })
      .catch(() => {
        console.log(chalk.red(command.toUpperCase() + ' FAILED'));
      });
  });
}

function patchCompare() {
  const reportIndex = path.resolve(getLibraryPath(), 'node_modules/backstopjs/compare/output/index.html');
  if (fs.existsSync(reportIndex)) {
    let html = fs.readFileSync(reportIndex, 'utf-8');
    const patchStartIndex = html.indexOf(PATCH_START);
    const patchEndIndex = html.indexOf(PATCH_END);
    if (patchStartIndex > 0 && patchEndIndex > patchStartIndex) {
      html = html.replace(new RegExp(PATCH_START + '.*' + patchEndIndex, 'gi'), customStyle);
    } else {
      html = html.replace('</head>', customStyle + '</head>');
    }
    fs.writeFileSync(reportIndex, html);
  } else {
    console.log(chalk.red('File does not exist: ' + reportIndex));
  }
}
