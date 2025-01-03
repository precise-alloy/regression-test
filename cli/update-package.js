import chalk from 'chalk';
import fs from 'fs';
import path from 'path';

async function updatePackageJson() {
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    console.log(chalk.red("package.json file doesn't exists"), err);
    return;
  }

  const packageJsonText = fs.readFileSync(packageJsonPath, 'utf8');
  const packageJson = JSON.parse(packageJsonText);

  packageJson.scripts = packageJson.scripts || {};
  packageJson.scripts.ref = 'regressify ref';
  packageJson.scripts.approve = 'regressify approve';
  packageJson.scripts.test = 'regressify test';

  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
}

updatePackageJson().catch((err) => console.error('Error:', err));
