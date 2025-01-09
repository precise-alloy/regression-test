import fs, { mkdirSync } from 'fs';
import path, { basename } from 'path';
import chalk from 'chalk';
import slash from 'slash';

export async function migrate() {
  try {
    const oldDataFolder = slash(path.join(process.cwd(), 'data'));
    const commonFolder = path.join(process.cwd(), 'common');
    const visualTestsFolder = path.join(process.cwd(), 'visual_tests');

    if (fs.existsSync(oldDataFolder)) {
      const files = fs.readdirSync(oldDataFolder);

      for (const file of files) {
        const fileName = basename(file);
        const source = slash(path.join(oldDataFolder, fileName));

        if (
          ['_cookies.yaml', '_on-ready.js', '_override.css', '_replacement-profiles.yaml', '_signing-in.yaml', '_viewports.yaml'].includes(fileName)
        ) {
          const destination = slash(path.join(commonFolder, fileName));

          fs.copyFileSync(source, destination);
        } else {
          const destination = slash(path.join(visualTestsFolder, fileName));

          fs.copyFileSync(source, destination);
        }
      }

      fs.rmdirSync(oldDataFolder, { recursive: true });
    }
  } catch (error) {
    console.log(chalk.red(error));
  }
}
