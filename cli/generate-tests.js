import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pkg from 'ncp';
import chalk from 'chalk';

const { ncp } = pkg;

async function askUser() {
  const sourceFolder = path.join(path.dirname(fileURLToPath(import.meta.url)), 'visual_tests');
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
}

askUser().catch((err) => console.error('Error:', err));
