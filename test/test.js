import { createFrSpellPredictor } from '../src/frspell.js';

const predictor = await createFrSpellPredictor({
  lemmaModelPath: 'models/small/lemma_type_model.int8.onnx',
  lemmaVocabPath: 'models/small/lemma_type_vocab.json',
  lemmaLabelsPath: 'models/small/lemma_type_labels.json',
  derivativeModelPath: 'models/small/derive_form_model.int8.onnx',
  derivativeVocabPath: 'models/small/derive_form_vocab.json',
});

const lemmaResult = await predictor.lemma('mangeons');
const nounResult = await predictor.nounDerive('chat', 'THD_PLF');
const adjeResult = await predictor.adjeDerive('beau', 'THD_F');
const verbResult1 = await predictor.verbDerive('manger', 'FST_PL', 'INDI', 'PRES');
const verbResult2 = await predictor.verbDerive('manger', 'SND_PL', 'INDI', 'FUTU');
const verbResult3 = await predictor.verbDerive('manger', 'FST_PL', 'INDI', 'PASS');
const verbResult4 = await predictor.verbDerive('manger', 'SND', 'SUBJ', 'PRES');
const verbResult5 = await predictor.verbDerive('manger', 'THD_PLF', 'PART', 'PASS');

console.log(lemmaResult);
console.log(nounResult);
console.log(adjeResult);
console.log(verbResult1);
console.log(verbResult2);
console.log(verbResult3);
console.log(verbResult4);
console.log(verbResult5);
