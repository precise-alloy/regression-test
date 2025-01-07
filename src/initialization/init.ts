import { addAutoSuggestion } from './auto-suggestion.js';
import { initCommonFolder, initVisualTestsFolder } from './generate-tests.js';
import { updatePackageJson } from './update-package.js';

export async function initRegressify() {
  await initCommonFolder();
  await initVisualTestsFolder();
  await updatePackageJson();
  addAutoSuggestion();
}
