import fs from 'node:fs/promises';
import path from 'node:path';

const WORD_RE = /^[A-Za-zÀ-ÖØ-öø-ÿ'’-]+$/;

const DEFAULT_TRAINING_CSV =
  'F:/davychen/2026doc/work/20260331_coderhome/20260420_dict/WORD-SUGGEST/training.csv';
const DEFAULT_DERIVE_CSV =
  'F:/davychen/2026doc/work/20260331_coderhome/20260420_dict/WORD-SUGGEST/training_derive.csv';

const ROOT = process.cwd();
const BENCH_DIR = path.join(ROOT, 'benchmark');

function isCommonWordLike(value) {
  if (typeof value !== 'string') return false;
  const text = value.trim();
  return text.length >= 2 && text.length <= 24 && WORD_RE.test(text);
}

function parseCsv(content) {
  const lines = content.split(/\r?\n/).filter((line) => line.length > 0);
  if (lines.length === 0) return [];

  const headers = lines[0].split(',').map((h) => h.trim());
  const rows = [];

  for (let i = 1; i < lines.length; i += 1) {
    const values = lines[i].split(',');
    if (values.length < headers.length) continue;

    const row = {};
    for (let j = 0; j < headers.length; j += 1) {
      row[headers[j]] = (values[j] ?? '').trim();
    }
    rows.push(row);
  }

  return rows;
}

function shuffle(items) {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function sampleRows(rows, count) {
  return shuffle(rows).slice(0, Math.min(count, rows.length));
}

function topFrequentLemmas(rows, topN) {
  const freq = new Map();
  for (const row of rows) {
    freq.set(row.lemma, (freq.get(row.lemma) ?? 0) + 1);
  }

  return new Set(
    [...freq.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, topN)
      .map(([lemma]) => lemma),
  );
}

function uniqueBy(rows, keySelector) {
  const seen = new Set();
  const output = [];
  for (const row of rows) {
    const key = keySelector(row);
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(row);
  }
  return output;
}

function buildVerbLemmaChecklist(trainingRows, limit) {
  const filtered = [];
  for (const row of trainingRows) {
    const input = row.input?.trim();
    const target = row.target?.trim();
    if (!input || !target) continue;

    const splitAt = target.lastIndexOf('_');
    if (splitAt <= 0 || splitAt === target.length - 1) continue;

    const lemma = target.slice(0, splitAt);
    const typeCode = target.slice(splitAt + 1);
    if (typeCode !== 'F') continue; // F => VERB in current model label mapping.
    if (!isCommonWordLike(input) || !isCommonWordLike(lemma)) continue;

    filtered.push({
      input,
      target: lemma,
    });
  }

  const deduped = uniqueBy(filtered, (r) => `${r.input}|${r.target}`);
  return sampleRows(deduped, limit);
}

function buildDeriveChecklist(rows, wordType, limit) {
  const typeRows = rows.filter(
    (row) =>
      row.word_type === wordType &&
      isCommonWordLike(row.lemma) &&
      isCommonWordLike(row.form) &&
      row.person &&
      row.mode &&
      row.tense,
  );

  const commonLemmaSet = topFrequentLemmas(typeRows, 2000);
  const commonRows = typeRows.filter((row) => commonLemmaSet.has(row.lemma));

  const formatted = commonRows.map((row) => ({
    lemma: row.lemma,
    person: row.person,
    mode: row.mode,
    tense: row.tense,
    target: row.form,
  }));

  const deduped = uniqueBy(
    formatted,
    (r) => `${r.lemma}|${r.person}|${r.mode}|${r.tense}|${r.target}`,
  );

  return sampleRows(deduped, limit);
}

async function main() {
  const trainingCsvPath = process.env.FRSPELL_TRAINING_CSV || DEFAULT_TRAINING_CSV;
  const deriveCsvPath = process.env.FRSPELL_DERIVE_CSV || DEFAULT_DERIVE_CSV;
  const limit = Number(process.env.FRSPELL_BENCHMARK_SIZE || '100');

  const [trainingRaw, deriveRaw] = await Promise.all([
    fs.readFile(trainingCsvPath, 'utf-8'),
    fs.readFile(deriveCsvPath, 'utf-8'),
  ]);

  const trainingRows = parseCsv(trainingRaw);
  const deriveRows = parseCsv(deriveRaw);

  const verbLemmaChecklist = buildVerbLemmaChecklist(trainingRows, limit);
  const nounChecklist = buildDeriveChecklist(deriveRows, 'NOUN', limit);
  const verbChecklist = buildDeriveChecklist(deriveRows, 'VERB', limit);
  const adjeChecklist = buildDeriveChecklist(deriveRows, 'ADJE', limit);

  if (
    verbLemmaChecklist.length < limit ||
    nounChecklist.length < limit ||
    verbChecklist.length < limit ||
    adjeChecklist.length < limit
  ) {
    throw new Error(
      `Not enough data to build all checklists at size ${limit}. ` +
        `Generated sizes: lemmaVerb=${verbLemmaChecklist.length}, noun=${nounChecklist.length}, ` +
        `verb=${verbChecklist.length}, adje=${adjeChecklist.length}`,
    );
  }

  await Promise.all([
    fs.writeFile(
      path.join(BENCH_DIR, 'checklist_lemma_verb_100.json'),
      JSON.stringify(verbLemmaChecklist, null, 2),
    ),
    fs.writeFile(
      path.join(BENCH_DIR, 'checklist_noun_100.json'),
      JSON.stringify(nounChecklist, null, 2),
    ),
    fs.writeFile(
      path.join(BENCH_DIR, 'checklist_verb_100.json'),
      JSON.stringify(verbChecklist, null, 2),
    ),
    fs.writeFile(
      path.join(BENCH_DIR, 'checklist_adje_100.json'),
      JSON.stringify(adjeChecklist, null, 2),
    ),
  ]);

  console.log('Generated benchmark checklists:');
  console.log(`- checklist_lemma_verb_100.json (${verbLemmaChecklist.length})`);
  console.log(`- checklist_noun_100.json (${nounChecklist.length})`);
  console.log(`- checklist_verb_100.json (${verbChecklist.length})`);
  console.log(`- checklist_adje_100.json (${adjeChecklist.length})`);
}

await main();
