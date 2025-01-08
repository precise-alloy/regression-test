import fs from 'fs';
import path from 'path';
import slash from 'slash';
import { getLibraryPath } from '../helpers.js';
import chalk from 'chalk';

export function getVersion() {
  try {
    const packageJsonPath = slash(path.join(getLibraryPath(), 'package.json'));
    if (!fs.existsSync(packageJsonPath)) {
      console.log(chalk.red("package.json file doesn't exists"));
      return;
    }

    const packageJsonText = fs.readFileSync(packageJsonPath, 'utf8');
    const packageData = JSON.parse(packageJsonText);

    console.log(packageData.version);
  } catch (error) {
    console.log(chalk.red(error));
  }
}
