import { readFileSync, mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const slug = value => value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export function parsePages(markdown) {
  const categories = [];
  const identifiers = new Set();
  const categoryIds = new Set();
  let category;
  for (const [index, line] of markdown.split(/\r?\n/).entries()) {
    if (!line.trim() || /^#/.test(line)) continue;
    const section = line.match(/^- (.+?)\s*:\s*$/);
    const entry = line.match(/^  - (?:\[([^\]]+)\]\(([a-z0-9][a-z0-9-]*)\)|([a-z0-9][a-z0-9-]*))(?:\s*:\s*(cor))?\s*$/);
    if (section) {
      const id = slug(section[1]);
      if (!id || categoryIds.has(id)) throw new Error(`Ligne ${index + 1} : rubrique vide ou dupliquée.`);
      categoryIds.add(id);
      category = { id, title: section[1].trim(), pages: [] };
      categories.push(category);
    } else if (entry && category) {
      const id = entry[2] || entry[3];
      if (identifiers.has(id)) throw new Error(`Ligne ${index + 1} : document dupliqué (${id}).`);
      identifiers.add(id);
      category.pages.push({ id, title: entry[1], correction: entry[4] === 'cor' });
    } else {
      throw new Error(`Ligne ${index + 1} : utiliser « - Rubrique : » puis «   - identifiant » ou «   - identifiant: cor ».`);
    }
  }
  if (!categories.length || categories.some(category => !category.pages.length)) throw new Error('Chaque rubrique doit contenir au moins un document.');
  return categories;
}

export function validateCatalogue(catalogue) {
  if (!Array.isArray(catalogue)) throw new Error('Catalogue Typst invalide.');
  const identifiers = new Set();
  for (const entry of catalogue) {
    if (typeof entry.id !== 'string' || typeof entry.titre !== 'string' || !entry.titre.trim() || identifiers.has(entry.id)) throw new Error('Titre ou identifiant invalide dans le catalogue Typst.');
    identifiers.add(entry.id);
  }
  return catalogue;
}

export async function loadCatalogue(siteRoot = root) {
  const local = process.env.EXERCICES_CATALOGUE || resolve(siteRoot, '../exercices/web/public/banque/catalogue.json');
  if (existsSync(local)) return validateCatalogue(JSON.parse(readFileSync(local, 'utf8')));
  if (process.env.EXERCICES_CATALOGUE) throw new Error(`Catalogue absent : ${local}`);
  const base = process.env.EXERCICES_WEB_URL || 'https://mpi-informatique.github.io/exercices';
  let catalogue;
  try {
    const response = await fetch(`${base.replace(/\/$/, '')}/banque/catalogue.json`, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    catalogue = await response.json();
  } catch (error) {
    console.warn(`Catalogue distant indisponible (${error.message}), utilisation de la dernière copie des titres Typst.`);
    catalogue = JSON.parse(readFileSync(join(siteRoot, 'typst-catalogue.json'), 'utf8'));
  }
  return validateCatalogue(catalogue);
}

export function generatePages(siteRoot = root, catalogue = JSON.parse(readFileSync(join(siteRoot, 'typst-catalogue.json'), 'utf8'))) {
  const categories = parsePages(readFileSync(join(siteRoot, 'pages-typst.md'), 'utf8'));
  const titles = new Map(validateCatalogue(catalogue).map(entry => [entry.id, entry.titre]));
  for (const category of categories) for (const page of category.pages) {
    if (!titles.has(page.id)) throw new Error(`Document absent du catalogue Typst : ${page.id}`);
    page.title ??= titles.get(page.id);
  }
  const output = join(siteRoot, 'docs/typst');
  rmSync(output, { recursive: true, force: true });
  for (const [categoryIndex, category] of categories.entries()) {
    const directory = join(output, category.id);
    mkdirSync(directory, { recursive: true });
    writeFileSync(join(directory, '_category_.json'), JSON.stringify({ label: category.title, position: categoryIndex + 1, collapsed: false }, null, 2) + '\n');
    for (const [pageIndex, page] of category.pages.entries()) {
      const frontMatter = [
        `title: ${JSON.stringify(page.title)}`,
        `sidebar_position: ${pageIndex + 1}`,
        `sidebar_custom_props: {cor: ${page.correction}}`,
        'hide_title: true', 'hide_table_of_contents: true', 'typst: true',
      ].join('\n');
      const component = `<TypstPdf id={${JSON.stringify(page.id)}} title={${JSON.stringify(page.title)}} correction={${page.correction}} />`;
      writeFileSync(join(directory, `${page.id}.mdx`), `---\n${frontMatter}\n---\n\nimport TypstPdf from '@site/src/components/TypstPdf';\n\n${component}\n`);
    }
  }
  return categories;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const catalogue = await loadCatalogue();
  const categories = generatePages(root, catalogue);
  // Cette copie permet aussi de construire le site sans accès réseau.
  writeFileSync(join(root, 'typst-catalogue.json'), JSON.stringify(catalogue.map(({ id, titre }) => ({ id, titre })), null, 2) + '\n');
  console.log(`Pages Typst : ${categories.reduce((count, category) => count + category.pages.length, 0)} documents.`);
}
