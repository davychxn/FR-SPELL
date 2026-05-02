# FR-SPELL

[English](README.md) | [中文](README.cn.md) | [Français](README.fr.md)

FR-SPELL is an npm package for French lemma prediction and derivative form generation.
It supports:

- conjugation to lemma prediction
- noun form generation
- adjective form generation
- verb form generation

The package runs with ONNX Runtime and quantized INT8 models for high speed and small model footprint.

## Install

```bash
npm install fr-spell
```

## Integrate Into Your Project

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

Sample runtime output:

```txt
{ input: 'mangeons', lemma: 'manger', wordType: 'VERB', confidence: 0.9965604285, timeMs: 3.89 }
{ lemma: 'chat', wordType: 'NOUN', person: 'THD_PLF', mode: 'ALL', tense: 'ALL', output: 'chattes', confidence: 0.9997230679, timeMs: 5.06 }
{ lemma: 'beau', wordType: 'ADJE', person: 'THD_F', mode: 'ALL', tense: 'ALL', output: 'belle', confidence: 0.9999751771, timeMs: 3.08 }
{ lemma: 'manger', wordType: 'VERB', person: 'FST_PL', mode: 'INDI', tense: 'PRES', output: 'mangeons', confidence: 0.9999864523, timeMs: 4.79 }
```

## Browser Usage

Use the browser bundle and model assets included in this package:

```html
<script src="./frspell.browser.js"></script>
<script>
	(async () => {
		const predictor = await window.FrSpell({
			modelBasePath: './models/community'
		});
		const result = await predictor.lemma('mangeons');
		console.log(result);
	})();
</script>
```

## Prediction Parameters

Lemma prediction:

- API: `predictor.lemma(input)`
- `input`: string, inflected/conjugated word form, for example `mangeons`

Derive prediction:

- Noun API: `predictor.nounDerive(lemma, person)`
- Adjective API: `predictor.adjeDerive(lemma, person)`
- Verb API: `predictor.verbDerive(lemma, person, mode, tense)`
- Generic API: `predictor.derive(lemma, wordType, person, mode, tense)`

Allowed `wordType` values:

- `NOUN` (noun)
- `ADJE` (adjective)
- `VERB` (verb)

Allowed `person` values:

- `FST` (1st person singular)
- `SND` (2nd person singular)
- `THD_M` (3rd person masculine singular)
- `THD_F` (3rd person feminine singular)
- `FST_PL` (1st person plural)
- `SND_PL` (2nd person plural)
- `THD_PLM` (3rd person masculine plural)
- `THD_PLF` (3rd person feminine plural)

Allowed `mode` values:

- `INDI` (indicative)
- `SUBJ` (subjunctive)
- `COND` (conditional)
- `PART` (participle)
- `IMPE` (imperative)
- `INFI` (infinitive)

Allowed `tense` values in current implementation:

- `PRES` (present)
- `IMPA` (imperfect)
- `FUTU` (future)
- `PASS` (past)

Note:

- The original grammar definition file includes more tense names, but this package implementation currently supports only `PRES`, `IMPA`, `FUTU`, `PASS`.
- For noun/adjective derive calls, `mode` and `tense` are not required in user input.

## Run Help

```bash
npm run help
```

This prints a quick parameter reference for `lemma`, `nounDerive`, `adjeDerive`, `verbDerive`, and `derive`, including allowed person/mode/tense values.

## Benchmark Result (Latest Local Run)

Results:

- lemma from conjugation: 97/100, accuracy 97.00%, average 22.21 ms
- noun derive: 100/100, accuracy 100.00%, average 23.46 ms
- verb derive: 100/100, accuracy 100.00%, average 23.18 ms
- adjective derive: 100/100, accuracy 100.00%, average 23.49 ms

## Model Size

- current default (community) lemma ONNX model: models/community/lemma_type_model.int8.onnx = 1.48 MB
- current default (community) derive ONNX model: models/community/derive_form_model.int8.onnx = 1.40 MB
- current default total ONNX model size: about 2.88 MB

Mini version note:

- mini lemma ONNX model target: 0.96 MB
- mini derive ONNX model target: 0.91 MB
- mini total ONNX model target: about 1.87 MB
- the mini model package is planned to be published soon.

## Why It Is Great For Web Frontend Products

- high accuracy for key French morphology tasks
- low per-request latency (about 22 to 23 ms average in latest local benchmark)
- current default ONNX footprint is compact (about 2.88 MB total), with a smaller mini model package (about 1.87 MB) coming soon
- ideal for backend inference powering web frontend features such as live writing assistance, grammar hints, and lemma-aware search
