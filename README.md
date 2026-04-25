# FRSPELL

[English](README.md) | [中文](README.cn.md) | [Français](README.fr.md)

FRSPELL is an npm package for French lemma prediction and derivative form generation.
It supports:

- conjugation to lemma prediction
- noun form generation
- adjective form generation
- verb form generation

The package runs with ONNX Runtime and quantized INT8 models for high speed and small model footprint.

## Install

```bash
npm install FrSpell
```

## Integrate Into Your Project

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

## Run Test

```bash
npm test
```

This executes test/test.js and prints sample prediction outputs.

## Run Benchmark

1) Prepare checklist JSON files (100 items each):

```bash
npm run benchmark:prepare
```

2) Run all benchmark suites:

```bash
npm run benchmark
```

3) Optional single-suite runs:

```bash
npm run benchmark:lemma
npm run benchmark:noun
npm run benchmark:verb
npm run benchmark:adje
```

## Benchmark Result (Latest Local Run)

Benchmark command:

```bash
npm run benchmark
```

Results:

- lemma from conjugation: 99/100, accuracy 99.00%, average 16.46 ms
- noun derive: 99/100, accuracy 99.00%, average 17.33 ms
- verb derive: 100/100, accuracy 100.00%, average 17.12 ms
- adjective derive: 100/100, accuracy 100.00%, average 17.34 ms

## Model Size

- lemma ONNX model: models/small/lemma_type_model.int8.onnx = 0.96 MB
- derive ONNX model: models/small/derive_form_model.int8.onnx = 0.91 MB
- total ONNX model size: about 1.87 MB

## Why It Is Great For Web Frontend Products

- high accuracy for key French morphology tasks
- low per-request latency (about 16 to 17 ms average in local benchmark)
- very small ONNX footprint (about 1.87 MB total)
- ideal for backend inference powering web frontend features such as live writing assistance, grammar hints, and lemma-aware search
