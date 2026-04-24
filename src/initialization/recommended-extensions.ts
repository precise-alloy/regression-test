import chalk from 'chalk';
import fs from 'fs';
import path from 'path';

type Extensions = {
  recommendations?: string[];
};

export type { Extensions };

export async function addExtensions() {
  patchRecommendations();
}

export function mergeRecommendedExtensions(extensions: Extensions): Extensions {
  const nextExtensions = JSON.parse(JSON.stringify(extensions || {})) as Extensions;

  nextExtensions.recommendations = nextExtensions.recommendations || [];
  nextExtensions.recommendations = [
    ...nextExtensions.recommendations,
    'tuyen.regressify',
    'dbaeumer.vscode-eslint',
    'eamodio.gitlens',
    'christian-kohler.path-intellisense',
    'esbenp.prettier-vscode',
    'redhat.vscode-yaml',
  ];

  nextExtensions.recommendations = [...new Set(nextExtensions.recommendations)];

  return nextExtensions;
}

function patchRecommendations() {
  try {
    const vsCodeFolder = path.join(process.cwd(), '.vscode');
    const extensionsJsonPath = path.join(vsCodeFolder, 'extensions.json');
    const json = fs.existsSync(extensionsJsonPath) ? fs.readFileSync(extensionsJsonPath, 'utf8') : '{}';
    const extensions = mergeRecommendedExtensions(JSON.parse(json) as Extensions);

    if (!fs.existsSync(vsCodeFolder)) {
      fs.mkdirSync(vsCodeFolder, { recursive: true });
    }
    fs.writeFileSync(extensionsJsonPath, JSON.stringify(extensions, null, 2));
  } catch (error) {
    console.log(chalk.red(error));
  }
}
