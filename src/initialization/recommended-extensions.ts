import chalk from 'chalk';
import fs from 'fs';
import path from 'path';

type Extensions = {
  recommendations?: string[];
};

export async function addExtensions() {
  patchRecommendations();
}

function patchRecommendations() {
  try {
    const vsCodeFolder = path.join(process.cwd(), '.vscode');
    const extensionsJsonPath = path.join(vsCodeFolder, 'extensions.json');
    const json = fs.existsSync(extensionsJsonPath) ? fs.readFileSync(extensionsJsonPath, 'utf8') : '{}';
    const extensions = JSON.parse(json) as Extensions;

    extensions.recommendations = extensions.recommendations || [];
    extensions.recommendations = [
      ...extensions.recommendations,
      'tuyen.regressify',
      'dbaeumer.vscode-eslint',
      'eamodio.gitlens',
      'christian-kohler.path-intellisense',
      'esbenp.prettier-vscode',
      'redhat.vscode-yaml',
    ];

    // Remove duplicates
    extensions.recommendations = [...new Set(extensions.recommendations)];

    if (!fs.existsSync(vsCodeFolder)) {
      fs.mkdirSync(vsCodeFolder, { recursive: true });
    }
    fs.writeFileSync(extensionsJsonPath, JSON.stringify(extensions, null, 2));
  } catch (error) {
    console.log(chalk.red(error));
  }
}
