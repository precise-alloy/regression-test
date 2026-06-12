import fs from 'fs';
import path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  applyConfigHashToHtmlIndex,
  applyHashesToConfigText,
  calculateFileHash,
  calculateTextHash,
  generateSummaryRows,
  processTestSuite,
  snapshot,
  summarizeReport,
} from '../src/snapshot.ts';
import { cleanupTempWorkspace, createTempWorkspace, useWorkspace, writeWorkspaceFile } from './test-utils.ts';

let tempWorkspaces: string[] = [];

function workspace(files: Record<string, string | Uint8Array> = {}) {
  const ws = createTempWorkspace(files);
  tempWorkspaces.push(ws);
  return ws;
}

afterEach(() => {
  vi.restoreAllMocks();
  tempWorkspaces.forEach(cleanupTempWorkspace);
  tempWorkspaces = [];
});

describe('snapshot.ts', () => {
  it('applies cache-busting hashes to config.js paths and the html index reference', () => {
    const configText = ["'bitmaps_test/run-1/ref.png'", '"bitmaps_test\\\\run-1\\\\test.png"'].join('\n');
    const updatedConfig = applyHashesToConfigText(configText, {
      'bitmaps_test/run-1/ref.png': 'hash-ref',
      'bitmaps_test\\run-1\\test.png': 'hash-test',
    });

    expect(updatedConfig).toContain('bitmaps_test/run-1/ref.png?v=hash-ref');
    expect(updatedConfig).toContain('bitmaps_test\\\\run-1\\\\test.png?v=hash-test');
    expect(applyConfigHashToHtmlIndex('<script src="config.js"></script>', 'cfg123')).toContain('config.js?v=cfg123');
  });

  it('summarizes Backstop reports and renders html rows with success and danger classes', () => {
    const summary = summarizeReport({
      id: 'alloy',
      testSuite: 'alloy',
      tests: [
        { status: 'pass', pair: {} },
        { status: 'fail', pair: {} },
      ],
    } as never);

    expect(summary).toEqual({
      id: 'alloy',
      totalTests: 2,
      totalPassed: 1,
      totalFailed: 1,
    });
    expect(generateSummaryRows([summary])).toContain('class="danger"');
    expect(generateSummaryRows([null as never, summary])).toContain('class="danger"');
  });

  it('hashes file content deterministically and returns null for missing suite structures', () => {
    const ws = workspace({
      'file.txt': 'same-content',
    });
    const filePath = path.join(ws, 'file.txt');

    expect(calculateFileHash(filePath)).toBe(calculateTextHash('same-content'));
    expect(processTestSuite(ws, { id: 'missing' } as never, {})).toBeNull();

    writeWorkspaceFile(ws, 'present/run-1/bitmaps_test/ref.txt', 'ref');
    expect(processTestSuite(path.join(ws, 'present'), { id: 'run-1' } as never, {})).toBeNull();

    writeWorkspaceFile(ws, 'with-html/run-2/html_report/index.html', '<html></html>');
    writeWorkspaceFile(ws, 'with-html/run-2/bitmaps_test/ref.txt', 'ref');
    expect(processTestSuite(path.join(ws, 'with-html'), { id: 'run-2' } as never, {})).toBeNull();
  });

  it('returns null when html_report exists but bitmaps_test directory is missing', () => {
    const ws = workspace();
    writeWorkspaceFile(ws, 'suite/html_report/config.js', "'bitmaps_test/run-1/ref.png'");
    expect(processTestSuite(ws, { id: 'suite' } as never, {})).toBeNull();
  });

  it('summarizes reports with missing tests array without throwing', () => {
    const summary = summarizeReport({ id: 'alloy', testSuite: 'alloy' } as never);
    expect(summary).toEqual({ id: 'alloy', totalTests: 0, totalPassed: 0, totalFailed: 0 });
  });

  it('processes a test suite report, removes unreferenced bitmap directories, and rewrites report assets', () => {
    const ws = workspace();
    const backstopDir = path.join(ws, '.backstop');
    const suiteDir = path.join(backstopDir, 'alloy');
    const referencedDir = path.join(suiteDir, 'bitmaps_test', 'run-1');
    const unreferencedDir = path.join(suiteDir, 'bitmaps_test', 'run-old');

    writeWorkspaceFile(
      ws,
      '.backstop/alloy/html_report/config.js',
      ["'bitmaps_test/run-1/ref.png'", '"bitmaps_test/run-1/test.png"', "'bitmaps_test/run-1/diff.png'"].join('\n')
    );
    writeWorkspaceFile(
      ws,
      '.backstop/alloy/html_report/index.html',
      '<html><head></head><body><script src="config.js"></script></body></html>'
    );
    writeWorkspaceFile(ws, '.backstop/alloy/bitmaps_test/run-1/ref.png', 'reference');
    writeWorkspaceFile(ws, '.backstop/alloy/bitmaps_test/run-1/test.png', 'test');
    writeWorkspaceFile(ws, '.backstop/alloy/bitmaps_test/run-1/diff.png', 'diff');
    writeWorkspaceFile(
      ws,
      '.backstop/alloy/bitmaps_test/run-1/report.json',
      JSON.stringify({
        id: 'alloy',
        testSuite: 'alloy',
        tests: [
          {
            status: 'pass',
            pair: {
              reference: 'run-1/ref.png',
              test: 'run-1/test.png',
              diffImage: 'run-1/diff.png',
            },
          },
        ],
      })
    );
    writeWorkspaceFile(ws, '.backstop/alloy/bitmaps_test/run-old/unused.txt', 'old');

    const summary = processTestSuite(backstopDir, { id: 'alloy' } as never, {});

    expect(summary).toEqual({ id: 'alloy', totalTests: 1, totalPassed: 1, totalFailed: 0 });
    expect(fs.existsSync(unreferencedDir)).toBe(false);

    const configText = fs.readFileSync(path.join(suiteDir, 'html_report', 'config.js'), 'utf-8');
    const configHash = calculateTextHash(configText);
    expect(configText).toMatch(/\?v=/);
    expect(fs.readFileSync(path.join(suiteDir, 'html_report', 'index.html'), 'utf-8')).toContain(`config.js?v=${configHash}`);
    expect(fs.existsSync(referencedDir)).toBe(true);
  });

  it('returns early when the backstop directory does not exist and sorts suite summaries in the final index', () => {
    const ws = workspace();
    useWorkspace(ws);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    snapshot({ configs: [], backstopDirName: '.missing' });
    expect(consoleSpy).toHaveBeenCalled();

    writeWorkspaceFile(ws, '.reports/b-suite/html_report/config.js', "'bitmaps_test/run-b/ref.png'");
    writeWorkspaceFile(
      ws,
      '.reports/b-suite/html_report/index.html',
      '<html><head></head><body><script src="config.js"></script></body></html>'
    );
    writeWorkspaceFile(ws, '.reports/b-suite/bitmaps_test/run-b/ref.png', 'b-ref');
    writeWorkspaceFile(
      ws,
      '.reports/b-suite/bitmaps_test/run-b/report.json',
      JSON.stringify({ id: 'b-suite', testSuite: 'b-suite', tests: [{ status: 'pass', pair: { reference: 'run-b/ref.png' } }] })
    );
    writeWorkspaceFile(ws, '.reports/a-suite/html_report/config.js', "'bitmaps_test/run-a/ref.png'");
    writeWorkspaceFile(
      ws,
      '.reports/a-suite/html_report/index.html',
      '<html><head></head><body><script src="config.js"></script></body></html>'
    );
    writeWorkspaceFile(ws, '.reports/a-suite/bitmaps_test/run-a/ref.png', 'a-ref');
    writeWorkspaceFile(
      ws,
      '.reports/a-suite/bitmaps_test/run-a/report.json',
      JSON.stringify({ id: 'a-suite', testSuite: 'a-suite', tests: [{ status: 'pass', pair: { reference: 'run-a/ref.png' } }] })
    );

    snapshot({ configs: [{ id: 'b-suite' }, { id: 'a-suite' }] as never, backstopDirName: '.reports' });

    const html = fs.readFileSync(path.join(ws, '.reports', 'index.html'), 'utf-8');
    expect(html.indexOf('a-suite')).toBeLessThan(html.indexOf('b-suite'));
  });
});
