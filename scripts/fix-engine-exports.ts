/**
 * Post-build step for the BackstopJS engine scripts.
 *
 * The engine `.ts` sources use idiomatic `export default`, which `tsc` compiles to
 * `exports.default = fn` plus an `__esModule` marker. BackstopJS loads engine scripts
 * via CommonJS `require()` and calls the result directly, so it needs `module.exports`
 * to be the function itself, not an `{ __esModule, default }` wrapper object.
 *
 * This appends a guarded unwrap to every compiled engine script: when the module was
 * emitted as an ES-module interop object, `module.exports` is collapsed to its default
 * export. Run automatically after `tsc` by the `build:engine` npm script.
 */
import { globSync } from 'glob';
import * as fs from 'fs';

const MARKER = '/* regressify:cjs-default-export */';
const SOURCE_MAP_COMMENT = '//# sourceMappingURL=';

const SNIPPET = `${MARKER}
if (module.exports && module.exports.__esModule && 'default' in module.exports) {
  module.exports = module.exports.default;
}
`;

const files = globSync('.engine_scripts/**/*.js', { ignore: 'node_modules/**' });

let patched = 0;

for (const file of files) {
  const content = fs.readFileSync(file, 'utf-8');

  if (content.includes(MARKER)) {
    continue;
  }

  if (!content.includes('__esModule')) {
    continue;
  }

  const mapIndex = content.indexOf(SOURCE_MAP_COMMENT);
  const updated =
    mapIndex >= 0
      ? content.slice(0, mapIndex) + SNIPPET + content.slice(mapIndex)
      : content.replace(/\s*$/, '\n') + SNIPPET;

  fs.writeFileSync(file, updated);
  patched++;
}

console.log(`[fix-engine-exports] unwrapped default export in ${patched} of ${files.length} compiled engine script(s)`);
