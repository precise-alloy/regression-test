import fs, { mkdirSync } from 'fs';
import path from 'path';
import pkg from 'ncp';
import chalk from 'chalk';
import { getLibraryPath } from '../helpers.js';
import slash from 'slash';

const { ncp } = pkg;

export async function initCommonFolder() {
  try {
    const sourceFolder = slash(path.join(getLibraryPath(), 'common'));
    const destinationFolder = path.join(process.cwd(), 'common');

    if (!fs.existsSync(destinationFolder)) {
      ncp(sourceFolder, destinationFolder, function (err) {
        if (err) {
          console.log(chalk.red('Error copying folder:'), err);
        } else {
          console.log(chalk.green('Folder "common" has been copied to your project!'));
        }
      });
    } else {
      console.log(chalk.yellow('Folder "common" already exists.'));
    }

    const requiredFiles = ['test-schema.json', 'replacement-profiles-schema.json'];

    for (const file of requiredFiles) {
      const source = slash(path.join(sourceFolder, file));
      const destination = slash(path.join(destinationFolder, file));

      const parentFolder = path.dirname(destination);
      if (!fs.existsSync(parentFolder)) {
        mkdirSync(parentFolder, { recursive: true });
      }

      if (fs.existsSync(source)) {
        fs.copyFileSync(source, destination);
      }
    }
  } catch (error) {
    console.log(chalk.red(error));
  }
}

export async function initVisualTestsFolder() {
  try {
    const sourceFolder = slash(path.join(getLibraryPath(), 'visual_tests'));
    const destinationFolder = path.join(process.cwd(), 'visual_tests');

    if (!fs.existsSync(destinationFolder)) {
      ncp(sourceFolder, destinationFolder, function (err) {
        if (err) {
          console.log(chalk.red('Error copying folder:'), err);
        } else {
          console.log(chalk.green('Folder "visual_tests" has been copied to your project!'));
        }
      });
    } else {
      console.log(chalk.yellow('Folder "visual_tests" already exists.'));
    }
  } catch (error) {
    console.log(chalk.red(error));
  }
}
