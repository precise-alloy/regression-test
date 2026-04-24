import chalk from 'chalk';
import fs from 'fs';
import path from 'path';

export function mergeRegressifyPackageScripts(packageJson: Record<string, unknown>) {
  const nextPackageJson = JSON.parse(JSON.stringify(packageJson || {})) as Record<string, unknown> & {
    scripts?: Record<string, string>;
  };

  nextPackageJson.scripts = nextPackageJson.scripts || {};
  nextPackageJson.scripts.ref = 'regressify ref';
  nextPackageJson.scripts.approve = 'regressify approve';
  nextPackageJson.scripts.test = 'regressify test';

  return nextPackageJson;
}

export async function updatePackageJson() {
  try {
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      console.log(chalk.red("package.json file doesn't exists"));
      return;
    }

    const packageJsonText = fs.readFileSync(packageJsonPath, 'utf8');
    const packageJson = mergeRegressifyPackageScripts(JSON.parse(packageJsonText));

    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  } catch (error) {
    console.log(chalk.red(error));
  }
}
