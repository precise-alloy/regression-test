import fs from 'fs';
import path, { basename } from 'path';
import chalk from 'chalk';
import slash from 'slash';

const markdown = `
# Precise Alloy - Regression Test

Please check [Documentation](https://tuyen.blog/optimizely-cms/testing/get-started/) for the instructions.
`;

export async function createMarkdownFile() {
  try {
    const markdownPath = slash(path.join(process.cwd(), 'README.md'));
    if (!fs.existsSync(markdownPath)) {
      fs.writeFileSync(markdownPath, markdown.trimStart());
    }
  } catch (error) {
    console.log(chalk.red(error));
  }
}
