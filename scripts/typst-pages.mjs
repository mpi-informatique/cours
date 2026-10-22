import { readFileSync, mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const slug = value => value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export function parsePages(markdown) {
  const lines = markdown.split(/\r?\n/).flatMap((line, index) => {
    if (!line.trim() || /^#/.test(line)) return [];
    const match = line.match(/^( *)- (.+?)\s*$/);
    if (!match || match[1].length % 2) throw new Error(`Ligne ${index + 1} : utiliser une liste Markdown avec deux espaces par niveau.`);
    return [{ depth: match[1].length / 2, text: match[2], line: index + 1 }];
  });
  const identifiers = new Set();
  let cursor = 0;
  function readLevel(depth) {
    const items = [];
    const siblingIds = new Set();
    while (cursor < lines.length && lines[cursor].depth >= depth) {
      const line = lines[cursor++];
      if (line.depth !== depth) throw new Error(`Ligne ${line.line} : niveau d'indentation manquant.`);
      let item;
      if (depth === 0 || lines[cursor]?.depth > depth) {
        const title = line.text.replace(/\s*:\s*$/, '').trim();
        const id = slug(title);
        if (!id || /[\[\]:]/.test(title)) throw new Error(`Ligne ${line.line} : titre de rubrique invalide.`);
        const children = readLevel(depth + 1);
        if (!children.length) throw new Error(`Ligne ${line.line} : chaque rubrique doit contenir au moins un document.`);
        item = { id, title, children };
      } else {
        const link = line.text.match(/^\[([^\]]+)\]\((doc:[a-z0-9_-]+(?:\/[a-z0-9_-]+)*|https?:\/\/[^\s)]+)\)$/i);
        if (link) {
          const target = link[2];
          item = target.startsWith('doc:')
            ? { id: target.slice(4), title: link[1], docId: target.slice(4) }
            : { id: target, title: link[1], href: target };
        } else {
          const entry = line.text.match(/^(?:\[([^\]]+)\]\(([a-z0-9][a-z0-9-]*)\)|([a-z0-9][a-z0-9-]*))(?:\s*:\s*(cor))?$/);
          if (!entry) throw new Error(`Ligne ${line.line} : utiliser un identifiant Typst, un lien « doc:… » ou une URL HTTP(S).`);
          item = { id: entry[2] || entry[3], title: entry[1], correction: entry[4] === 'cor' };
        }
        if (identifiers.has(item.id)) throw new Error(`Ligne ${line.line} : document dupliqué (${item.id}).`);
        identifiers.add(item.id);
      }
      if (siblingIds.has(item.id)) throw new Error(`Ligne ${line.line} : identifiant dupliqué (${item.id}).`);
      siblingIds.add(item.id);
      items.push(item);
    }
    return items;
  }
  const categories = readLevel(0);
  if (!categories.length) throw new Error('Le menu doit contenir au moins une rubrique.');
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
  function resolveTitles(items) {
    for (const item of items) {
      if (item.children) resolveTitles(item.children);
      else if (!item.docId && !item.href) {
        if (!titles.has(item.id)) throw new Error(`Document absent du catalogue Typst : ${item.id}`);
        item.title ??= titles.get(item.id);
      }
    }
  }
  resolveTitles(categories);
  const output = join(siteRoot, 'docs/typst');
  rmSync(output, { recursive: true, force: true });
  mkdirSync(output, { recursive: true });
  function writeItems(items, directory) {
    for (const [index, item] of items.entries()) {
      if (item.children) {
        const childDirectory = join(directory, item.id);
        mkdirSync(childDirectory, { recursive: true });
        writeFileSync(join(childDirectory, '_category_.json'), JSON.stringify({ label: item.title, position: index + 1, collapsed: true }, null, 2) + '\n');
        writeItems(item.children, childDirectory);
      } else if (!item.docId && !item.href) {
        const frontMatter = [
          `title: ${JSON.stringify(item.title)}`,
          `sidebar_position: ${index + 1}`,
          `sidebar_custom_props: {cor: ${item.correction}}`,
          'hide_title: true', 'hide_table_of_contents: true', 'typst: true',
        ].join('\n');
        const component = `<TypstPdf id={${JSON.stringify(item.id)}} title={${JSON.stringify(item.title)}} correction={${item.correction}} />`;
        writeFileSync(join(directory, `${item.id}.mdx`), `---\n${frontMatter}\n---\n\nimport TypstPdf from '@site/src/components/TypstPdf';\n\n${component}\n`);
      }
    }
  }
  writeItems(categories, output);
  function sidebarItems(items, parentPath) {
    return items.map(item => {
      if (item.children) return { type: 'category', label: item.title, collapsed: true, items: sidebarItems(item.children, `${parentPath}/${item.id}`) };
      if (item.href) return { type: 'link', label: item.title, href: item.href };
      if (item.docId) return { type: 'doc', label: item.title, id: item.docId };
      return { type: 'doc', id: `${parentPath}/${item.id}` };
    });
  }
  const navigation = {
    sidebars: Object.fromEntries(categories.map(category => [category.id, sidebarItems(category.children, `typst/${category.id}`)])),
    navbar: categories.map(category => ({ type: 'docSidebar', sidebarId: category.id, label: category.title, position: 'left' })),
  };
  writeFileSync(join(output, 'navigation.json'), JSON.stringify(navigation, null, 2) + '\n');
  return categories;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const catalogue = await loadCatalogue();
  generatePages(root, catalogue);
  // Cette copie permet aussi de construire le site sans accès réseau.
  writeFileSync(join(root, 'typst-catalogue.json'), JSON.stringify(catalogue.map(({ id, titre }) => ({ id, titre })), null, 2) + '\n');
  console.log("Pages et navigation Typst générées depuis pages-typst.md.");
}
