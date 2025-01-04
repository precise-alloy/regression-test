import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
export async function updatePackageJson() {
    try {
        const packageJsonPath = path.join(process.cwd(), 'package.json');
        if (!fs.existsSync(packageJsonPath)) {
            console.log(chalk.red("package.json file doesn't exists"));
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
    catch (error) {
        console.log(chalk.red(error));
    }
}
//# sourceMappingURL=update-package.js.map