# Cours d'informatique en MPI au lycée la Martinière Monplaisir

## Développement avec Nix

Entrer dans l'environnement de développement, installer les dépendances puis démarrer le site :

```sh
nix develop
npm install
npm run start
```

## Lecteur Typst

Le menu **Langages**, défini dans `pages-typst.md`, intègre le lecteur PDF de la banque d'exercices pour `cours-langages-reguliers.typ`. La présentation s'ouvre par défaut. Le lecteur occupe tout l'espace disponible sous la navigation, suit le thème du site sans recompiler et propose un bouton de présentation en plein écran.

Pour essayer avec les deux sites locaux, démarrer `just web` depuis le dépôt voisin `exercices`, puis lancer ici :

```sh
EXERCICES_WEB_URL=http://127.0.0.1:4321 nix develop -c npm run start
```

Ouvrir <http://127.0.0.1:3000/cours/docs/typst/langages/langages-reguliers/cours-langages-reguliers>. Employer le même nom d'hôte pour les deux sites locaux (`127.0.0.1` ici) afin de permettre le chargement de l'iframe. La variable `EXERCICES_WEB_URL` désigne la racine du site d'exercices ; sans cette variable, le composant utilise sa version GitHub Pages. Elle est prise en compte au démarrage ou à la construction du site.

## Définir les pages en Markdown

Modifier `pages-typst.md` pour définir les menus de navigation, les rubriques de la sidebar et l'ordre des documents :

```markdown
- Langages
  - Langages réguliers
    - cours-langages-reguliers
    - td-langage: cor
```

Le premier niveau crée les menus de la barre de navigation. Les niveaux intermédiaires créent les catégories de la sidebar ; leur imbrication est libre, avec deux espaces par niveau. Les dernières entrées désignent les documents. Le menu Langages conserve tous les chapitres, résumés, QCM, TD et liens de l’ancien menu.

Les identifiants sont ceux de la banque d'exercices, sans extension `.typ`. Le libellé de la sidebar reprend automatiquement le titre déclaré dans le fichier Typst. `cor` ajoute le corrigé au lecteur et le bouton « corrigé » au menu, avec l'énoncé à l'ouverture d'un TD. Sans `cor`, le lecteur de la page ne propose pas la variante corrigée. Les ressources restent publiques dans la banque ; ce réglage définit l'interface, pas une restriction d'accès. Un cours proposant une présentation s'ouvre sur celle-ci ; les autres documents s'ouvrent sur leur énoncé.

Pour choisir un libellé, utiliser un lien Markdown : `  - [Langages réguliers](cours-langages-reguliers)` ou `  - [TD de langages](td-langage): cor`.

Pour conserver une page MDX existante, utiliser son identifiant Docusaurus : `- [Résumé de cours](doc:langages/reguliers/poly_reguliers)`. Un lien HTTP(S) crée une entrée externe : `- [Exercices interactifs sur les automates](https://fortierq.github.io/automates)`. Ces entrées rejoignent la même sidebar que les PDF Typst. Les réglages de correction des pages existantes restent définis dans leur en-tête MDX.

Les titres proviennent de `banque/catalogue.json`, exporté par la banque à partir des métadonnées Typst. Le générateur utilise d'abord l'export local du dépôt voisin, puis le catalogue du site publié. `EXERCICES_CATALOGUE` permet de fournir un autre fichier local. `typst-catalogue.json` conserve une copie des titres pour les constructions sans réseau ; une indisponibilité distante est signalée dans les logs. Après une modification des titres Typst, régénérer l'export de la banque puis reconstruire le site de cours.

Le lecteur charge des PDF précompilés lors de la préparation de la banque. Il n'initialise pas le compilateur Typst dans le navigateur. La présentation est préchargée en arrière-plan pendant la lecture du cours écrit. En plein écran, seule la page PDF est visible ; Échap quitte la présentation et les flèches ou Espace changent de page.

`npm run start` et `npm run build` génèrent les pages dans `docs/typst/`, ignoré par Git. Relancer le serveur après une modification du menu. Les pages sont accessibles sous `/cours/docs/typst/<menu>/<rubriques>/<identifiant>`. Les pages existantes référencées dans le menu conservent leurs adresses et affichent la même sidebar que les documents Typst.

Pour intégrer manuellement un document dans une page MDX, importer `@site/src/components/TypstPdf` et utiliser `<TypstPdf id="cours-kleene" title="Théorème de Kleene" />`, avec `hide_title: true`, `hide_table_of_contents: true` et `typst: true` dans l'en-tête. La propriété facultative `variant` accepte `enonce`, `corrige` ou `presentation` ; `correction={true}` propose aussi le corrigé.

Vérifier la génération avec `nix develop -c node --test scripts/typst-pages.test.mjs`.
