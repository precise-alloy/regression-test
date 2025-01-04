import { initVisualTestsFolder } from './generate-tests.js';
import { updatePackageJson } from './update-package.js';

export async function initRegressify() {
  await initVisualTestsFolder();
  await updatePackageJson();
}
