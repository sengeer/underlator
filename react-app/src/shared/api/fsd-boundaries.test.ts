/**
 * @module FsdBoundariesTests
 * Виджеты и pages не импортируют transports (eslint + обход дерева).
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const reactAppRoot = join(here, '../../..');

function walkTsFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      walkTsFiles(full, acc);
      continue;
    }
    if (entry.endsWith('.ts') || entry.endsWith('.tsx')) {
      acc.push(full);
    }
  }
  return acc;
}

describe('FSD: widgets/pages не импортируют transports', () => {
  it('eslint запрещает shared/api/transports из widgets и pages', () => {
    const eslintrc = readFileSync(join(reactAppRoot, '.eslintrc.json'), 'utf8');
    expect(eslintrc).toMatch(/src\/widgets\/\*\*\/\*\.\{ts,tsx\}/);
    expect(eslintrc).toMatch(/src\/pages\/\*\*\/\*\.\{ts,tsx\}/);
    expect(eslintrc).toMatch(/no-restricted-imports/);
    expect(eslintrc).toMatch(/shared\/api\/transports/);
  });

  it('реальное дерево widgets/pages не импортирует transports', () => {
    const roots = [
      join(reactAppRoot, 'src/widgets'),
      join(reactAppRoot, 'src/pages'),
    ];
    const offenders: string[] = [];
    for (const root of roots) {
      for (const file of walkTsFiles(root)) {
        const source = readFileSync(file, 'utf8');
        if (
          /from ['"][^'"]*shared\/api\/transports/.test(source) ||
          /from ['"][^'"]*\/transports\/(http|electron|tauri)-transport/.test(
            source
          )
        ) {
          offenders.push(relative(reactAppRoot, file));
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
