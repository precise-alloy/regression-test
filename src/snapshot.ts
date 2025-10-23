import path from 'path';
import fs from 'fs';
import { Config } from 'backstopjs';
import chalk from 'chalk';
import crypto from 'node:crypto';
import { BackstopReport, BackstopTest, HtmlReportSummary } from './types';

function calculateFileHash(filePath: string): string {
  const content = fs.readFileSync(filePath);
  const sha1Hash = crypto.createHash('sha1');

  sha1Hash.update(content);
  return sha1Hash.digest('base64url').substring(0, 10);
}

function calculateTextHash(text: string): string {
  const sha1Hash = crypto.createHash('sha1');

  sha1Hash.update(text);
  return sha1Hash.digest('base64url').substring(0, 10);
}

function processTestSuite(backstopDir: string, config: Config, hashes: Record<string, string>): HtmlReportSummary | null {
  const testDir = path.join(backstopDir, config.id);
  if (!fs.existsSync(testDir)) {
    console.log(chalk.red(`Test directory does not exist: ${testDir}`));
    return null;
  }

  const htmlReportDir = path.join(testDir, 'html_report');
  const bitmapTestDir = path.join(testDir, 'bitmaps_test');

  if (!fs.existsSync(htmlReportDir)) {
    return null;
  }

  const configPath = path.join(htmlReportDir, 'config.js');
  const htmlIndexPath = path.join(htmlReportDir, 'index.html');

  if (!fs.existsSync(configPath)) {
    return null;
  }

  const configText = fs.readFileSync(configPath, 'utf-8');

  const subDirs = fs
    .readdirSync(bitmapTestDir, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);

  for (const subDir of subDirs) {
    const subDirFullPath = path.join(bitmapTestDir, subDir);

    if (!configText.includes(`bitmaps_test/${subDir}`) && !configText.includes(`bitmaps_test\\\\${subDir}`)) {
      // Remove unreferenced snapshot directory
      fs.rmSync(subDirFullPath, { recursive: true, force: true });
      console.log(chalk.yellow(`Removed unreferenced snapshot directory: ${subDirFullPath}`));
    } else {
      // console.log(chalk.green(`Snapshot directory is referenced: ${subDir}`));
      const reportJsonPath = path.join(subDirFullPath, 'report.json');
      if (fs.existsSync(reportJsonPath)) {
        const reportText = fs.readFileSync(reportJsonPath, 'utf-8');
        const report = JSON.parse(reportText) as BackstopReport;
        const passCount = report?.tests?.filter((t) => t.status === 'pass').length ?? 0;
        const failCount = report?.tests?.filter((t) => t.status === 'fail').length ?? 0;

        if (report?.tests) {
          [].forEach.call(report.tests, (test: BackstopTest) => {
            if (test?.pair?.reference) {
              const referencePath = path.join(bitmapTestDir, test.pair.reference);
              if (fs.existsSync(referencePath)) {
                if (!hashes[test.pair.reference]) {
                  const hash = calculateFileHash(referencePath);
                  hashes[test.pair.reference] = hash;
                  console.log(`Calculated hash for reference image: ${test.pair.reference} => ${hash}`);
                }
              }
            }

            if (test?.pair?.test) {
              const testPath = path.join(bitmapTestDir, test.pair.test);
              if (fs.existsSync(testPath)) {
                if (!hashes[test.pair.test]) {
                  const hash = calculateFileHash(testPath);
                  hashes[test.pair.test] = hash;
                  console.log(`Calculated hash for test image: ${test.pair.test} => ${hash}`);
                }
              }
            }
          });
        }

        let modifiedConfigText = configText;
        for (const [filePath, hash] of Object.entries(hashes)) {
          if (modifiedConfigText.includes(filePath)) {
            modifiedConfigText = modifiedConfigText
              .replaceAll("'" + filePath + "'", "'" + `${filePath}?v=${hash}` + "'")
              .replaceAll('"' + filePath + '"', '"' + `${filePath}?v=${hash}` + '"')
              .replaceAll("'" + filePath.replaceAll('\\', '\\\\') + "'", "'" + `${filePath.replaceAll('\\', '\\\\')}?v=${hash}` + "'")
              .replaceAll('"' + filePath.replaceAll('\\', '\\\\') + '"', '"' + `${filePath.replaceAll('\\', '\\\\')}?v=${hash}` + '"');
          }
        }
        fs.writeFileSync(configPath, modifiedConfigText, 'utf-8');

        const configHash = calculateTextHash(modifiedConfigText);
        const htmlIndexText = fs.readFileSync(htmlIndexPath, 'utf-8');
        let modifiedHtmlIndexText = htmlIndexText
          .replaceAll("'config.js'", `'config.js?v=${configHash}'`)
          .replaceAll('"config.js"', `"config.js?v=${configHash}"`);
        fs.writeFileSync(htmlIndexPath, modifiedHtmlIndexText, 'utf-8');

        console.log(chalk.green(`Snapshot directory: ${subDir}, Passed: ${passCount}, Failed: ${failCount}`));

        return {
          id: report.id,
          totalTests: report.tests.length,
          totalPassed: passCount,
          totalFailed: failCount,
        };
      }
    }
  }

  return null;
}

const generateHtmlReportSummary = (backstopDir: string, summaries: HtmlReportSummary[]) => {
  const htmlTemplate = `<html>
  <head>
    <title>Snapshot Report Summary</title>
    <style>
      body {
        margin: 0;
        padding: 40px 24px;
        font-family: Arial, sans-serif;
      }

      h1 {
        margin: 40px 0 60px;
        text-align: center;
      }

      table {
        margin: 0 auto;
        max-width: 800px;
        border-collapse: collapse;
        border: 2px solid #888;
      }

      th,
      td {
        text-align: center;
        padding: 12px 16px;
        border: 1px solid #aaa;
      }

      th {
        background-color: #f2f2f2;
      }

      .success {
        color: green;
        background-color: #d4edda;
        font-weight: bold;
      }

      .danger {
        color: red;
        background-color: #f8d7da;
        font-weight: bold;
      }
    </style>
  </head>

  <body>
    <h1>Visual Tests Summary</h1>
    <table>
      <tr>
        <th>Test Suite</th>
        <th>Total Tests</th>
        <th>Passed</th>
        <th>Failed</th>
      </tr>
      <!-- PLACEHOLDER -->
    </table>
  </body>
</html>
`;
  let html = '';

  for (const summary of summaries) {
    if (!summary) {
      continue;
    }

    const successClass = summary.totalPassed === summary.totalTests ? 'class="success"' : '';
    const dangerClass = summary.totalFailed > 0 ? 'class="danger"' : '';

    html += `<tr>`;
    html += `<td><a href="./${summary.id}/html_report/index.html">${summary.id}</a></td>`;
    html += `<td>${summary.totalTests}</td>`;
    html += `<td ${successClass}>${summary.totalPassed}</td>`;
    html += `<td ${dangerClass}>${summary.totalFailed}</td>`;
    html += `</tr>`;
  }

  const finalHtml = htmlTemplate.replace('<!-- PLACEHOLDER -->', html);

  const reportPath = path.join(backstopDir, 'index.html');
  fs.writeFileSync(reportPath, finalHtml, 'utf-8');
  console.log(chalk.blue(`Snapshot report summary generated at: ${reportPath}`));
};

export function snapshot({ configs, backstopDirName }: { configs: Config[]; backstopDirName: string }) {
  const backstopDir = path.join(process.cwd(), backstopDirName);
  if (!fs.existsSync(backstopDir)) {
    console.log(chalk.red(`Backstop directory does not exist: ${backstopDir}`));
    return;
  }

  const htmlReportSummary: HtmlReportSummary[] = [];
  const hashes: Record<string, string> = {};

  for (const config of configs) {
    const summary = processTestSuite(backstopDir, config, hashes);
    if (summary) {
      htmlReportSummary.push(summary);
    }
  }

  htmlReportSummary.sort((a, b) => a.id.localeCompare(b.id));

  generateHtmlReportSummary(backstopDir, htmlReportSummary);
}
