import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { generatePages, parsePages } from './typst-pages.mjs';

test('Le menu respecte les rubriques, leur ordre et les corrigés explicitement demandés', () => {
  const categories = parsePages('# Mes cours\n\n- Langages :\n  - cours-langages-reguliers\n  - [TD langages](td-langage): cor\n- Graphes :\n  - parcours\n');
  assert.deepEqual(categories, [
    { id: 'langages', title: 'Langages', pages: [{ id: 'cours-langages-reguliers', title: 'cours-langages-reguliers', correction: false }, { id: 'td-langage', title: 'TD langages', correction: true }] },
    { id: 'graphes', title: 'Graphes', pages: [{ id: 'parcours', title: 'parcours', correction: false }] },
  ]);
});

test('Un menu incorrect est refusé au lieu de produire des routes ambiguës', () => {
  for (const input of [
    '- Langages :\n',
    '  - cours-langages-reguliers\n',
    '- Langages :\n  - td-langage: correction\n',
    '- Langages :\n  - ../secret\n',
    '- Langages :\n  - td-langage\n  - td-langage: cor\n',
    '- Algèbre :\n  - premier\n- Algebre :\n  - second\n',
  ]) assert.throws(() => parsePages(input));
});

test('La génération produit des pages sans titre visible et retire les documents supprimés du menu', () => {
  const root = mkdtempSync(join(tmpdir(), 'mpi-typst-pages-'));
  try {
    writeFileSync(join(root, 'pages-typst.md'), '- Langages :\n  - cours-langages-reguliers\n  - td-langage: cor\n');
    generatePages(root);
    const course = readFileSync(join(root, 'docs/typst/langages/cours-langages-reguliers.mdx'), 'utf8');
    const td = readFileSync(join(root, 'docs/typst/langages/td-langage.mdx'), 'utf8');
    assert.match(course, /hide_title: true/);
    assert.match(course, /typst: true/);
    assert.match(course, /correction=\{false\}/);
    assert.match(td, /sidebar_custom_props: \{cor: true\}/);
    assert.match(td, /correction=\{true\}/);
    writeFileSync(join(root, 'pages-typst.md'), '- Langages :\n  - td-langage: cor\n');
    generatePages(root);
    assert.equal(existsSync(join(root, 'docs/typst/langages/cours-langages-reguliers.mdx')), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
