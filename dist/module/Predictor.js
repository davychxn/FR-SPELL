/**
 * FR-SPELL core predictor implementation
 * Author: Davy Chen <davy.chen@163.com>
 * Profile: https://www.linkedin.com/in/davychxn/
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as ort from 'onnxruntime-node';

function argmax(arr) {
  let bestIdx = 0;
  let bestVal = arr[0];
  for (let i = 1; i < arr.length; i += 1) {
    if (arr[i] > bestVal) {
      bestVal = arr[i];
      bestIdx = i;
    }
  }
  return { index: bestIdx, value: bestVal };
}

function softmaxAt(logits, idx) {
  let maxVal = -Infinity;
  for (let i = 0; i < logits.length; i += 1) {
    if (logits[i] > maxVal) maxVal = logits[i];
  }
  let sum = 0;
  for (let i = 0; i < logits.length; i += 1) {
    sum += Math.exp(logits[i] - maxVal);
  }
  return Math.exp(logits[idx] - maxVal) / sum;
}

function makeInt64Tensor2D(rows) {
  const batch = rows.length;
  const seq = rows[0].length;
  const data = new BigInt64Array(batch * seq);
  let k = 0;
  for (let i = 0; i < batch; i += 1) {
    for (let j = 0; j < seq; j += 1) {
      data[k] = BigInt(rows[i][j]);
      k += 1;
    }
  }
  return new ort.Tensor('int64', data, [batch, seq]);
}

function makeInt64Tensor1D(values) {
  const data = new BigInt64Array(values.length);
  for (let i = 0; i < values.length; i += 1) {
    data[i] = BigInt(values[i]);
  }
  return new ort.Tensor('int64', data, [values.length]);
}

function toStoi(itos) {
  const stoi = {};
  for (let i = 0; i < itos.length; i += 1) stoi[itos[i]] = i;
  return stoi;
}

function decodeTextFromIds(ids, itos, specials) {
  let out = '';
  for (const id of ids) {
    const tok = itos[id];
    if (tok === specials.eos) break;
    if (tok === specials.pad || tok === specials.bos || tok === specials.unk) continue;
    out += tok;
  }
  return out;
}

function normalizeEnumToken(value, fallback) {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim().toUpperCase();
  }
  return fallback;
}

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = path.resolve(MODULE_DIR, '..');

const DEFAULT_MODEL_PATHS = {
  lemmaModelPath: path.resolve(PACKAGE_ROOT, 'models/community/lemma_type_model.int8.onnx'),
  lemmaVocabPath: path.resolve(PACKAGE_ROOT, 'models/community/lemma_type_vocab.json'),
  lemmaLabelsPath: path.resolve(PACKAGE_ROOT, 'models/community/lemma_type_labels.json'),
  derivativeModelPath: path.resolve(PACKAGE_ROOT, 'models/community/derive_form_model.int8.onnx'),
  derivativeVocabPath: path.resolve(PACKAGE_ROOT, 'models/community/derive_form_vocab.json'),
};

export async function createLemmaTypePredictor({
  modelPath,
  vocabPath,
  labelsPath,
  maxDecodeLen,
  executionProviders,
}) {
  const resolvedModel = path.resolve(modelPath);
  const resolvedVocab = path.resolve(vocabPath);
  const resolvedLabels = path.resolve(labelsPath);

  const [vocabRaw, labelsRaw] = await Promise.all([
    fs.readFile(resolvedVocab, 'utf-8'),
    fs.readFile(resolvedLabels, 'utf-8'),
  ]);

  const vocab = JSON.parse(vocabRaw);
  const labels = JSON.parse(labelsRaw);

  const itos = vocab.itos;
  const stoi = toStoi(itos);

  const idToCode = {};
  for (const [k, v] of Object.entries(vocab.id_to_code)) {
    idToCode[Number(k)] = v;
  }
  const codeCharToName = labels.code_char_to_name || {};

  const PAD = '<pad>';
  const BOS = '<bos>';
  const EOS = '<eos>';
  const UNK = '<unk>';

  const padId = stoi[PAD];
  const bosId = stoi[BOS];
  const eosId = stoi[EOS];
  const unkId = stoi[UNK];

  const session = await ort.InferenceSession.create(resolvedModel, {
    executionProviders: executionProviders || ['cpu'],
    graphOptimizationLevel: 'all',
  });
  const inputNameSet = new Set(session.inputNames);

  const decodeLimit = maxDecodeLen || labels.max_decode_len || 32;

  function encodeWord(word) {
    const ids = [];
    for (const ch of word) {
      ids.push(stoi[ch] ?? unkId);
    }
    ids.push(eosId);
    return ids;
  }

  const specials = {
    pad: PAD,
    bos: BOS,
    eos: EOS,
    unk: UNK,
  };

  async function predict(word) {
    const t0 = performance.now();
    const srcIds = encodeWord(word);
    const srcTensor = makeInt64Tensor2D([srcIds]);
    const srcLenTensor = makeInt64Tensor1D([srcIds.length]);

    let tgt = [bosId];
    let codeLogits = null;
    const lemmaTokenIds = [];

    for (let step = 0; step < decodeLimit; step += 1) {
      const tgtTensor = makeInt64Tensor2D([tgt]);
      const outputs = await session.run({
        ...(inputNameSet.has('src') ? { src: srcTensor } : {}),
        ...(inputNameSet.has('src_len') ? { src_len: srcLenTensor } : {}),
        ...(inputNameSet.has('tgt_in') ? { tgt_in: tgtTensor } : {}),
      });

      const token = outputs.token_logits;
      const code = outputs.code_logits;
      codeLogits = code.data;

      // token_logits shape: [1, tgt_len, vocab_size]
      const vocabSize = token.dims[2];
      const tgtLen = tgt.length;
      const lastOffset = (tgtLen - 1) * vocabSize;
      const lastStep = token.data.slice(lastOffset, lastOffset + vocabSize);
      const { index: nextId } = argmax(lastStep);

      lemmaTokenIds.push(nextId);
      if (nextId === eosId) break;
      tgt.push(nextId);
    }

    const predLemma = decodeTextFromIds(lemmaTokenIds, itos, specials);
    const codeBest = argmax(codeLogits);
    const predCode = idToCode[codeBest.index] || 'A';
    const codeConf = softmaxAt(codeLogits, codeBest.index);
    const predType = codeCharToName[predCode] || 'UNKNOWN';

    return {
      input: word,
      lemma: predLemma,
      wordType: predType,
      confidence: codeConf,
      timeMs: performance.now() - t0,
    };
  }

  async function lemma(word) {
    return predict(word);
  }

  async function predictBatch(words) {
    const out = [];
    for (const w of words) {
      // Keep sequential to keep implementation simple and deterministic.
      out.push(await predict(w));
    }
    return out;
  }

  return {
    predict,
    lemma,
    predictBatch,
    metadata: {
      modelPath: resolvedModel,
      vocabSize: itos.length,
      decodeLimit,
    },
  };
}

export async function createDerivativeTypePredictor({
  modelPath,
  vocabPath,
  maxDecodeLen,
  executionProviders,
}) {
  const resolvedModel = path.resolve(modelPath);
  const resolvedVocab = path.resolve(vocabPath);

  const vocabRaw = await fs.readFile(resolvedVocab, 'utf-8');
  const vocab = JSON.parse(vocabRaw);
  const itos = vocab.itos;
  const stoi = toStoi(itos);

  const PAD = '<pad>';
  const BOS = '<bos>';
  const EOS = '<eos>';
  const UNK = '<unk>';

  const padId = stoi[PAD];
  const bosId = stoi[BOS];
  const eosId = stoi[EOS];
  const unkId = stoi[UNK];

  if (padId === undefined || bosId === undefined || eosId === undefined || unkId === undefined) {
    throw new Error('Invalid derive vocab: missing special tokens <pad>/<bos>/<eos>/<unk>.');
  }

  const session = await ort.InferenceSession.create(resolvedModel, {
    executionProviders: executionProviders || ['cpu'],
    graphOptimizationLevel: 'all',
  });
  const inputNameSet = new Set(session.inputNames);
  const outputTokenName = session.outputNames.includes('token_logits')
    ? 'token_logits'
    : session.outputNames[0];

  const decodeLimit = maxDecodeLen || 48;
  const specials = {
    pad: PAD,
    bos: BOS,
    eos: EOS,
    unk: UNK,
  };

  function encodeText(text, addBos = false, addEos = false) {
    const ids = [];
    if (addBos) ids.push(bosId);
    for (const ch of text) ids.push(stoi[ch] ?? unkId);
    if (addEos) ids.push(eosId);
    return ids;
  }

  function buildSourceText(lemma, wordType, person, mode, tense) {
    return `L:${lemma}|W:${wordType}|P:${person}|M:${mode}|T:${tense}`;
  }

  async function predict(lemma, wordType, sentencePerson, sentenceMode, sentenceTense) {
    const t0 = performance.now();
    const normalizedLemma = String(lemma || '').trim();
    const normalizedWordType = normalizeEnumToken(wordType, 'NONE');
    const normalizedPerson = normalizeEnumToken(sentencePerson, 'ALL');
    const isNounOrAdje = normalizedWordType === 'NOUN' || normalizedWordType === 'ADJE';
    const normalizedMode = isNounOrAdje
      ? normalizeEnumToken(sentenceMode, 'ALL')
      : normalizeEnumToken(sentenceMode, 'NONE');
    const normalizedTense = isNounOrAdje
      ? normalizeEnumToken(sentenceTense, 'ALL')
      : normalizeEnumToken(sentenceTense, 'NONE');

    const source = buildSourceText(
      normalizedLemma,
      normalizedWordType,
      normalizedPerson,
      normalizedMode,
      normalizedTense,
    );

    const srcIds = encodeText(source, false, true);
    const srcTensor = makeInt64Tensor2D([srcIds]);
    const srcLenTensor = makeInt64Tensor1D([srcIds.length]);

    const tokenIds = [];
    let lastStepLogits = null;
    let tgt = [bosId];

    for (let step = 0; step < decodeLimit; step += 1) {
      const tgtTensor = makeInt64Tensor2D([tgt]);
      const outputs = await session.run({
        ...(inputNameSet.has('src') ? { src: srcTensor } : {}),
        ...(inputNameSet.has('src_len') ? { src_len: srcLenTensor } : {}),
        ...(inputNameSet.has('tgt_in') ? { tgt_in: tgtTensor } : {}),
      });

      const token = outputs[outputTokenName];
      const vocabSize = token.dims[2];
      const tgtLen = tgt.length;
      const lastOffset = (tgtLen - 1) * vocabSize;
      lastStepLogits = token.data.slice(lastOffset, lastOffset + vocabSize);
      const { index: nextId } = argmax(lastStepLogits);

      tokenIds.push(nextId);
      if (nextId === eosId) break;
      tgt.push(nextId);
    }

    const form = decodeTextFromIds(tokenIds, itos, specials);
    const bestId = argmax(lastStepLogits).index;
    const confidence = softmaxAt(lastStepLogits, bestId);

    return {
      lemma: normalizedLemma,
      wordType: normalizedWordType,
      person: normalizedPerson,
      mode: normalizedMode,
      tense: normalizedTense,
      output: form,
      confidence,
      timeMs: performance.now() - t0,
    };
  }

  async function nounDerive(lemma, sentencePerson, sentenceMode, sentenceTense) {
    return predict(lemma, 'NOUN', sentencePerson, sentenceMode, sentenceTense);
  }

  async function adjeDerive(lemma, sentencePerson, sentenceMode, sentenceTense) {
    return predict(lemma, 'ADJE', sentencePerson, sentenceMode, sentenceTense);
  }

  async function verbDerive(lemma, sentencePerson, sentenceMode, sentenceTense) {
    return predict(lemma, 'VERB', sentencePerson, sentenceMode, sentenceTense);
  }

  return {
    predict,
    derive: predict,
    nounDerive,
    adjeDerive,
    verbDerive,
    metadata: {
      modelPath: resolvedModel,
      vocabSize: itos.length,
      decodeLimit,
    },
  };
}

export async function FrSpell(options = {}) {
  const {
    lemmaModelPath = DEFAULT_MODEL_PATHS.lemmaModelPath,
    lemmaVocabPath = DEFAULT_MODEL_PATHS.lemmaVocabPath,
    lemmaLabelsPath = DEFAULT_MODEL_PATHS.lemmaLabelsPath,
    derivativeModelPath = DEFAULT_MODEL_PATHS.derivativeModelPath,
    derivativeVocabPath = DEFAULT_MODEL_PATHS.derivativeVocabPath,
    lemmaMaxDecodeLen,
    derivativeMaxDecodeLen,
    executionProviders,
  } = options;

  const [lemmaPredictor, derivativePredictor] = await Promise.all([
    createLemmaTypePredictor({
      modelPath: lemmaModelPath,
      vocabPath: lemmaVocabPath,
      labelsPath: lemmaLabelsPath,
      maxDecodeLen: lemmaMaxDecodeLen,
      executionProviders,
    }),
    createDerivativeTypePredictor({
      modelPath: derivativeModelPath,
      vocabPath: derivativeVocabPath,
      maxDecodeLen: derivativeMaxDecodeLen,
      executionProviders,
    }),
  ]);

  return {
    lemma: lemmaPredictor.lemma,
    derive: derivativePredictor.derive,
    nounDerive: derivativePredictor.nounDerive,
    adjeDerive: derivativePredictor.adjeDerive,
    verbDerive: derivativePredictor.verbDerive,
    metadata: {
      lemma: lemmaPredictor.metadata,
      derivative: derivativePredictor.metadata,
    },
  };
}
