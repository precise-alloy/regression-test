import fs from 'fs';
import path, { basename } from 'path';
import chalk from 'chalk';
import slash from 'slash';

export const COMMON_MIGRATION_FILES = [
  '_cookies.yaml',
  '_on-ready.js',
  '_override.css',
  '_replacement-profiles.yaml',
  '_signing-in.yaml',
  '_viewports.yaml',
];

export function getMigrationDestination(fileName: string, commonFolder: string, visualTestsFolder: string) {
  return slash(path.join(COMMON_MIGRATION_FILES.includes(fileName) ? commonFolder : visualTestsFolder, fileName));
}

export async function migrate() {
  try {
    const oldDataFolder = slash(path.join(process.cwd(), 'data'));
    const commonFolder = path.join(process.cwd(), 'common');
    const visualTestsFolder = path.join(process.cwd(), 'visual_tests');
    const engineScriptsFolder = path.join(process.cwd(), '.engine_scripts');

    if (fs.existsSync(oldDataFolder)) {
      const files = fs.readdirSync(oldDataFolder);

      for (const file of files) {
        const fileName = basename(file);
        const source = slash(path.join(oldDataFolder, fileName));

        if (COMMON_MIGRATION_FILES.includes(fileName)) {
          const destination = getMigrationDestination(fileName, commonFolder, visualTestsFolder);
          fs.mkdirSync(path.dirname(destination), { recursive: true });

          fs.copyFileSync(source, destination);
        } else {
          const destination = getMigrationDestination(fileName, commonFolder, visualTestsFolder);
          fs.mkdirSync(path.dirname(destination), { recursive: true });

          fs.copyFileSync(source, destination);
        }
      }

      fs.rmdirSync(oldDataFolder, { recursive: true });
    }

    if (fs.existsSync(engineScriptsFolder)) {
      fs.rmdirSync(engineScriptsFolder, { recursive: true });
    }
  } catch (error) {
    console.log(chalk.red(error));
  }
}
