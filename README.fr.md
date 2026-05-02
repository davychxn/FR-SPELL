# FR-SPELL

[English](README.md) | [中文](README.cn.md) | [Français](README.fr.md)

FR-SPELL est un package npm pour la prédiction de lemme en français et la génération de formes dérivées.
Fonctionnalités prises en charge :

- prédiction du lemme à partir d'une forme conjuguée
- génération de formes nominales
- génération de formes adjectivales
- génération de formes verbales

Le package s'appuie sur ONNX Runtime et des modèles INT8 quantifiés pour offrir une grande vitesse avec une empreinte mémoire réduite.

## Installation

```bash
npm install fr-spell
```

## Intégration dans votre projet

```js
import { FrSpell } from 'fr-spell';

const predictor = await FrSpell();

const lemma = await predictor.lemma('mangeons');
const noun = await predictor.nounDerive('chat', 'THD_PLF');
const adje = await predictor.adjeDerive('beau', 'THD_F');
const verb = await predictor.verbDerive('manger', 'FST_PL', 'INDI', 'PRES');

console.log(lemma);
console.log(noun);
console.log(adje);
console.log(verb);
```

Exemple de sortie a l'execution :

```txt
{ input: 'mangeons', lemma: 'manger', wordType: 'VERB', confidence: 0.9965604285, timeMs: 3.89 }
{ lemma: 'chat', wordType: 'NOUN', person: 'THD_PLF', mode: 'ALL', tense: 'ALL', output: 'chattes', confidence: 0.9997230679, timeMs: 5.06 }
{ lemma: 'beau', wordType: 'ADJE', person: 'THD_F', mode: 'ALL', tense: 'ALL', output: 'belle', confidence: 0.9999751771, timeMs: 3.08 }
{ lemma: 'manger', wordType: 'VERB', person: 'FST_PL', mode: 'INDI', tense: 'PRES', output: 'mangeons', confidence: 0.9999864523, timeMs: 4.79 }
```

## Parametres de prediction

Prediction de lemme :

- API : `predictor.lemma(input)`
- `input` : chaine de caracteres, forme flechie/conjuguee, par exemple `mangeons`

Prediction de derive :

- API nom : `predictor.nounDerive(lemma, person)`
- API adjectif : `predictor.adjeDerive(lemma, person)`
- API verbe : `predictor.verbDerive(lemma, person, mode, tense)`
- API generique : `predictor.derive(lemma, wordType, person, mode, tense)`

Valeurs `wordType` autorisees :

- `NOUN` (nom)
- `ADJE` (adjectif)
- `VERB` (verbe)

Valeurs `person` autorisees :

- `FST` (1re personne du singulier)
- `SND` (2e personne du singulier)
- `THD_M` (3e personne masculine du singulier)
- `THD_F` (3e personne feminine du singulier)
- `FST_PL` (1re personne du pluriel)
- `SND_PL` (2e personne du pluriel)
- `THD_PLM` (3e personne masculine du pluriel)
- `THD_PLF` (3e personne feminine du pluriel)

Valeurs `mode` autorisees :

- `INDI` (indicatif)
- `SUBJ` (subjonctif)
- `COND` (conditionnel)
- `PART` (participe)
- `IMPE` (imperatif)
- `INFI` (infinitif)

Valeurs `tense` prises en charge dans l'implementation actuelle :

- `PRES` (present)
- `IMPA` (imparfait)
- `FUTU` (futur)
- `PASS` (passe)

Note :

- Le fichier de definitions d'origine contient plus de noms de temps, mais ce package prend actuellement en charge uniquement `PRES`, `IMPA`, `FUTU`, `PASS`.
- Pour les appels nom/adjectif, `mode` et `tense` ne sont pas requis dans l'entree utilisateur.

## Exécuter les tests

```bash
npm test
```

Cette commande exécute test/test.js et affiche des exemples de prédiction.

## Afficher l'aide

```bash
npm run help
```

Cette commande affiche un guide rapide des paramètres pour `lemma`, `nounDerive`, `adjeDerive`, `verbDerive` et `derive`, avec les valeurs autorisées de person/mode/tense.

## Construire le bundle navigateur

```bash
npm run build
```

Sortie de build :

- `dist/frspell.browser.js` (fichier JS unique, expose `window.FrSpell`)
- `dist/models/community/*.onnx|*.json` (ressources modèle et vocabulaire requises)

Après le build, copiez tout le dossier `dist` dans votre projet frontend, puis utilisez :

```html
<script src="./dist/frspell.browser.js"></script>
<script>
	(async () => {
		const predictor = await window.FrSpell({
			modelBasePath: './dist/models/community'
		});
		const result = await predictor.lemma('mangeons');
		console.log(result);
	})();
</script>
```

## Exécuter les benchmarks

1) Générer les fichiers JSON de checklist (100 éléments chacun) :

```bash
npm run benchmark:prepare
```

2) Exécuter toutes les suites de benchmark :

```bash
npm run benchmark
```

3) Optionnel : exécuter une suite spécifique :

```bash
npm run benchmark:lemma
npm run benchmark:noun
npm run benchmark:verb
npm run benchmark:adje
```

## Résultats de benchmark (dernier run local)

Commande de benchmark :

```bash
npm run benchmark
```

Résultats :

- lemme depuis une conjugaison : 97/100, précision 97.00 %, moyenne 21.97 ms
- dérivation nominale : 100/100, précision 100.00 %, moyenne 23.19 ms
- dérivation verbale : 100/100, précision 100.00 %, moyenne 22.93 ms
- dérivation adjectivale : 100/100, précision 100.00 %, moyenne 23.22 ms

## Taille des modèles

- modèle ONNX lemme par défaut (community) : models/community/lemma_type_model.int8.onnx = 1.48 MB
- modèle ONNX dérivation par défaut (community) : models/community/derive_form_model.int8.onnx = 1.40 MB
- taille ONNX totale par défaut actuelle : environ 2.88 MB

Note sur la version mini :

- taille cible du modèle lemme mini : 0.96 MB
- taille cible du modèle dérivation mini : 0.91 MB
- taille ONNX totale cible de la version mini : environ 1.87 MB
- le package de modèles mini sera publié prochainement.

## Pourquoi c'est idéal pour des produits web frontend

- excellente précision sur les tâches clés de morphologie française
- faible latence par requête (environ 22 à 23 ms en moyenne sur le dernier benchmark local)
- empreinte ONNX par défaut toujours compacte (environ 2.88 MB au total), avec un package mini plus léger (environ 1.87 MB) à venir
- parfait pour alimenter des fonctionnalités frontend via une inférence backend : assistance à l'écriture en temps réel, suggestions grammaticales et recherche basée sur le lemme
