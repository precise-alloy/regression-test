import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

export const createNodeVersionFiles = async () => {
  try {
    const packageJsonPath = path.join(process.cwd(), '.nvmrc');
    fs.writeFileSync(packageJsonPath, 'v22');

    const nodeVersionPath = path.join(process.cwd(), '.node-version');
    fs.writeFileSync(nodeVersionPath, 'v22');
  } catch (error) {
    console.log(chalk.red(error));
  }
};
