# Cours d'informatique en MPI au lycée la Martinière Monplaisir

## Développement avec Nix

Entrer dans l'environnement de développement, installer les dépendances puis démarrer le site :

```sh
nix develop
npm install
npm run start
```

## Démonstration du lecteur Typst

La page `/cours/docs/poc-langages-reguliers` intègre le lecteur PDF de la banque d'exercices pour `cours-langages-reguliers.typ`, avec les variantes Cours, Cours corrigé et Présentation. Elle est accessible dans la rubrique Langages, sous « Aperçu du lecteur Typst ».

Pour essayer avec les deux sites locaux, démarrer `just web` depuis le dépôt voisin `exercices`, puis lancer ici :

```sh
EXERCICES_WEB_URL=http://127.0.0.1:4321 nix develop -c npm run start
```

Ouvrir <http://127.0.0.1:3000/cours/docs/poc-langages-reguliers>. Employer le même nom d'hôte pour les deux sites locaux (`127.0.0.1` ici) afin de permettre le chargement de l'iframe. La variable `EXERCICES_WEB_URL` désigne la racine du site d'exercices ; sans cette variable, le composant utilise sa version GitHub Pages. Elle est prise en compte au démarrage ou à la construction du site.

Pour intégrer un autre document, importer `@site/src/components/TypstPdf` dans une page MDX puis utiliser `<TypstPdf id="cours-kleene" title="Théorème de Kleene" />`. La propriété facultative `variant` accepte `enonce`, `corrige` ou `presentation`. Le lecteur suit le thème du site et propose aussi une ouverture dans un nouvel onglet.
