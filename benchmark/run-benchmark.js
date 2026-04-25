import fs from 'node:fs/promises';
import path from 'node:path';
import { createFrSpellPredictor } from '../src/frspell.js';

const ROOT = process.cwd();
const CHECKLIST_FILES = {
  lemma: 'checklist_lemma_verb_100.json',
  noun: 'checklist_noun_100.json',
  verb: 'checklist_verb_100.json',
  adje: 'checklist_adje_100.json',
};

function mean(values) {
  if (values.length === 0) return 0;
  return values.reduce((sum, n) => sum + n, 0) / values.length;
}

async function loadChecklist(fileName) {
  const fullPath = path.join(ROOT, 'benchmark', fileName);
  const raw = await fs.readFile(fullPath, 'utf-8');
  return JSON.parse(raw);
}

async function runLemmaBenchmark(predictor, checklist) {
  let correct = 0;
  const elapsed = [];

  for (const item of checklist) {
    const t0 = performance.now();
    const result = await predictor.lemma(item.input);
    elapsed.push(performance.now() - t0);

    if (result.lemma === item.target) {
      correct += 1;
    }
  }

  return {
    name: 'lemma-from-conjugation',
    size: checklist.length,
    correct,
    accuracy: checklist.length > 0 ? correct / checklist.length : 0,
    avgMs: mean(elapsed),
  };
}

async function runDeriveBenchmark(predictor, checklist, type) {
  let correct = 0;
  const elapsed = [];

  for (const item of checklist) {
    const t0 = performance.now();
    const result =
      type === 'noun'
        ? await predictor.nounDerive(item.lemma, item.person, item.mode, item.tense)
        : type === 'verb'
          ? await predictor.verbDerive(item.lemma, item.person, item.mode, item.tense)
          : await predictor.adjeDerive(item.lemma, item.person, item.mode, item.tense);

    elapsed.push(performance.now() - t0);
    if (result.output === item.target) {
      correct += 1;
    }
  }

  return {
    name: `${type}-derive`,
    size: checklist.length,
    correct,
    accuracy: checklist.length > 0 ? correct / checklist.length : 0,
    avgMs: mean(elapsed),
  };
}

function printSummary(summary) {
  const accuracyPct = (summary.accuracy * 100).toFixed(2);
  const avgMs = summary.avgMs.toFixed(2);

  console.log(`[${summary.name}]`);
  console.log(`  samples : ${summary.size}`);
  console.log(`  correct : ${summary.correct}`);
  console.log(`  accuracy: ${accuracyPct}%`);
  console.log(`  avg time: ${avgMs} ms`);
}

async function main() {
  const mode = process.argv[2] || 'all';

  const predictor = await createFrSpellPredictor({
    lemmaModelPath: 'models/small/lemma_type_model.int8.onnx',
    lemmaVocabPath: 'models/small/lemma_type_vocab.json',
    lemmaLabelsPath: 'models/small/lemma_type_labels.json',
    derivativeModelPath: 'models/small/derive_form_model.int8.onnx',
    derivativeVocabPath: 'models/small/derive_form_vocab.json',
  });

  const jobs = [];

  if (mode === 'all' || mode === 'lemma') {
    const checklist = await loadChecklist(CHECKLIST_FILES.lemma);
    jobs.push(runLemmaBenchmark(predictor, checklist));
  }

  if (mode === 'all' || mode === 'noun') {
    const checklist = await loadChecklist(CHECKLIST_FILES.noun);
    jobs.push(runDeriveBenchmark(predictor, checklist, 'noun'));
  }

  if (mode === 'all' || mode === 'verb') {
    const checklist = await loadChecklist(CHECKLIST_FILES.verb);
    jobs.push(runDeriveBenchmark(predictor, checklist, 'verb'));
  }

  if (mode === 'all' || mode === 'adje') {
    const checklist = await loadChecklist(CHECKLIST_FILES.adje);
    jobs.push(runDeriveBenchmark(predictor, checklist, 'adje'));
  }

  if (jobs.length === 0) {
    throw new Error(`Unsupported benchmark mode: ${mode}`);
  }

  const summaries = await Promise.all(jobs);
  for (const summary of summaries) {
    printSummary(summary);
  }
}

await main();
