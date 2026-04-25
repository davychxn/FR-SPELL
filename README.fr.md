# FRSPELL

[English](README.md) | [中文](README.cn.md) | [Français](README.fr.md)

FRSPELL est un package npm pour la prédiction de lemme en français et la génération de formes dérivées.
Fonctionnalités prises en charge :

- prédiction du lemme à partir d'une forme conjuguée
- génération de formes nominales
- génération de formes adjectivales
- génération de formes verbales

Le package s'appuie sur ONNX Runtime et des modèles INT8 quantifiés pour offrir une grande vitesse avec une empreinte mémoire réduite.

## Installation

```bash
npm install FrSpell
```

## Intégration dans votre projet

```js
import { FrSpell } from 'FrSpell';

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

## Exécuter les tests

```bash
npm test
```

Cette commande exécute test/test.js et affiche des exemples de prédiction.

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

- lemme depuis une conjugaison : 99/100, précision 99.00 %, moyenne 16.46 ms
- dérivation nominale : 99/100, précision 99.00 %, moyenne 17.33 ms
- dérivation verbale : 100/100, précision 100.00 %, moyenne 17.12 ms
- dérivation adjectivale : 100/100, précision 100.00 %, moyenne 17.34 ms

## Taille des modèles

- modèle ONNX lemme : models/small/lemma_type_model.int8.onnx = 0.96 MB
- modèle ONNX dérivation : models/small/derive_form_model.int8.onnx = 0.91 MB
- taille totale ONNX : environ 1.87 MB

## Pourquoi c'est idéal pour des produits web frontend

- excellente précision sur les tâches clés de morphologie française
- faible latence par requête (environ 16 à 17 ms en moyenne sur benchmark local)
- empreinte ONNX très compacte (environ 1.87 MB au total)
- parfait pour alimenter des fonctionnalités frontend via une inférence backend : assistance à l'écriture en temps réel, suggestions grammaticales et recherche basée sur le lemme
