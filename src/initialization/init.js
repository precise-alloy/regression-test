import { initVisualTestsFolder } from './generate-tests';
import { updatePackageJson } from './update-package';
export async function initRegressify() {
    await initVisualTestsFolder();
    await updatePackageJson();
}
//# sourceMappingURL=init.js.map