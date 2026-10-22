import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { generatePages, parsePages } from './typst-pages.mjs';

const catalogue = [{ id: 'cours-langages-reguliers', titre: 'Langages réguliers' }, { id: 'td-langage', titre: 'TD : Langages réguliers' }];

test('Le menu respecte les rubriques, leur ordre et les corrigés explicitement demandés', () => {
  const categories = parsePages('# Mes cours\n\n- Langages :\n  - cours-langages-reguliers\n  - [TD langages](td-langage): cor\n- Graphes :\n  - parcours\n');
  assert.deepEqual(categories, [
    { id: 'langages', title: 'Langages', children: [{ id: 'cours-langages-reguliers', title: undefined, correction: false }, { id: 'td-langage', title: 'TD langages', correction: true }] },
    { id: 'graphes', title: 'Graphes', children: [{ id: 'parcours', title: undefined, correction: false }] },
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
    generatePages(root, catalogue);
    const course = readFileSync(join(root, 'docs/typst/langages/cours-langages-reguliers.mdx'), 'utf8');
    const td = readFileSync(join(root, 'docs/typst/langages/td-langage.mdx'), 'utf8');
    assert.match(course, /hide_title: true/);
    assert.match(course, /typst: true/);
    assert.match(course, /correction=\{false\}/);
    assert.match(course, /title: "Langages réguliers"/);
    assert.match(td, /title: "TD : Langages réguliers"/);
    assert.match(td, /sidebar_custom_props: \{cor: true\}/);
    assert.match(td, /correction=\{true\}/);
    writeFileSync(join(root, 'pages-typst.md'), '- Langages :\n  - td-langage: cor\n');
    generatePages(root, catalogue);
    assert.equal(existsSync(join(root, 'docs/typst/langages/cours-langages-reguliers.mdx')), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('Un identifiant inconnu ne remplace pas silencieusement le titre Typst', () => {
  const root = mkdtempSync(join(tmpdir(), 'mpi-typst-pages-'));
  try {
    writeFileSync(join(root, 'pages-typst.md'), '- Langages :\n  - inconnu\n');
    assert.throws(() => generatePages(root, catalogue), /absent du catalogue/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('Les menus de navigation et les catégories imbriquées suivent le Markdown', () => {
  const root = mkdtempSync(join(tmpdir(), 'mpi-typst-navigation-'));
  try {
    writeFileSync(join(root, 'pages-typst.md'), '- Langages\n  - Langages réguliers\n    - cours-langages-reguliers\n    - Exercices\n      - td-langage: cor\n- Graphes\n  - parcours\n');
    generatePages(root, [...catalogue, { id: 'parcours', titre: 'Parcours de graphes' }]);
    const navigation = JSON.parse(readFileSync(join(root, 'docs/typst/navigation.json'), 'utf8'));
    assert.deepEqual(navigation, {
      sidebars: {
        langages: [{ type: 'category', label: 'Langages réguliers', collapsed: true, items: [
          { type: 'doc', id: 'typst/langages/langages-reguliers/cours-langages-reguliers' },
          { type: 'category', label: 'Exercices', collapsed: true, items: [{ type: 'doc', id: 'typst/langages/langages-reguliers/exercices/td-langage' }] },
        ] }],
        graphes: [{ type: 'doc', id: 'typst/graphes/parcours' }],
      },
      navbar: [
        { type: 'docSidebar', sidebarId: 'langages', label: 'Langages', position: 'left' },
        { type: 'docSidebar', sidebarId: 'graphes', label: 'Graphes', position: 'left' },
      ],
    });
    const category = JSON.parse(readFileSync(join(root, 'docs/typst/langages/langages-reguliers/_category_.json'), 'utf8'));
    assert.equal(category.label, 'Langages réguliers');
    assert.equal(category.position, 1);
    assert.equal(category.collapsed, true);
    const course = readFileSync(join(root, 'docs/typst/langages/langages-reguliers/cours-langages-reguliers.mdx'), 'utf8');
    assert.match(course, /title: "Langages réguliers"/);
    assert.match(course, /sidebar_position: 1/);
    const td = readFileSync(join(root, 'docs/typst/langages/langages-reguliers/exercices/td-langage.mdx'), 'utf8');
    assert.match(td, /correction=\{true\}/);
    assert.equal(existsSync(join(root, 'docs/typst/graphes/parcours.mdx')), true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('Les sauts de niveau et les collisions entre catégories et documents sont refusés', () => {
  for (const input of [
    '- Langages\n    - td-langage\n',
    '- Langages\n   - td-langage\n',
    '- Langages\n  - Cours\n    - td-langage\n  - Cours\n    - cours-langages-reguliers\n',
    '- Langages\n  - td-langage\n    - cours-langages-reguliers\n  - td-langage: cor\n',
  ]) assert.throws(() => parsePages(input));
});

test('Le menu mélange les PDF Typst, les pages existantes et les liens externes', () => {
  const root = mkdtempSync(join(tmpdir(), 'mpi-typst-mixed-'));
  try {
    writeFileSync(join(root, 'pages-typst.md'), '- Langages\n  - cours-langages-reguliers\n  - [Résumé de cours](doc:langages/reguliers/poly_reguliers)\n  - [Exercices interactifs](https://fortierq.github.io/automates)\n');
    generatePages(root, catalogue);
    const navigation = JSON.parse(readFileSync(join(root, 'docs/typst/navigation.json'), 'utf8'));
    assert.deepEqual(navigation.sidebars.langages, [
      { type: 'doc', id: 'typst/langages/cours-langages-reguliers' },
      { type: 'doc', label: 'Résumé de cours', id: 'langages/reguliers/poly_reguliers' },
      { type: 'link', label: 'Exercices interactifs', href: 'https://fortierq.github.io/automates' },
    ]);
    assert.equal(existsSync(join(root, 'docs/typst/langages/cours-langages-reguliers.mdx')), true);
    assert.equal(existsSync(join(root, 'docs/typst/langages/langages')), false);
    for (const target of ['doc:../secret', 'javascript:alert', 'doc:/absolu']) {
      assert.throws(() => parsePages(`- Langages\n  - [Invalide](${target})\n`));
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('Langages conserve les 18 documents et le lien interactif de l’ancien menu', () => {
  const [menu] = parsePages(readFileSync(new URL('../pages-typst.md', import.meta.url), 'utf8'));
  assert.equal(menu.title, 'Langages');
  assert.deepEqual(menu.children.filter(item => item.children).map(item => item.title), ['Langages réguliers', 'Automates', 'Théorème de Kleene', 'Grammaire', 'Centrale 2022']);
  const entries = menu.children.flatMap(item => item.children || [item]);
  assert.deepEqual(entries.map(item => item.id), [
    'cours-langages-reguliers', 'langages/reguliers/poly_reguliers', 'langages/reguliers/qcm_reguliers', 'td-langage',
    'cours-automates', 'td-automate', 'langages/automate/poly_automate', 'langages/automate/qcm_automate',
    'cours-kleene', 'langages/kleene/qcm_kleene', 'td-kleene', 'langages/kleene/poly_kleene',
    'langages/grammaire/qcm_grammaire', 'langages/grammaire/grammaire', 'td-grammaire', 'langages/grammaire/poly_grammaire', 'langages/grammaire/ambigue',
    'langages/centrale22/centrale22', 'https://fortierq.github.io/automates',
  ]);
  assert.deepEqual(entries.filter(item => item.correction).map(item => item.id), ['td-langage', 'td-automate']);
  assert.equal(entries.find(item => item.id === 'td-kleene').correction, false);
  assert.equal(entries.find(item => item.id === 'td-grammaire').correction, false);
});
