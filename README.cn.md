# FRSPELL

[English](README.md) | [中文](README.cn.md) | [Français](README.fr.md)

FRSPELL 是一个用于法语词形还原与派生形态生成的 npm 包。
支持能力如下：

- 将动词变位形式预测为词元（lemma）
- 名词词形生成
- 形容词词形生成
- 动词词形生成

该包基于 ONNX Runtime 与 INT8 量化模型，兼顾高速度与小体积。

## 安装

```bash
npm install FrSpell
```

## 集成到你的项目

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

示例运行输出：

```txt
{ input: 'mangeons', lemma: 'manger', wordType: 'VERB', confidence: 0.9965604285, timeMs: 3.89 }
{ lemma: 'chat', wordType: 'NOUN', person: 'THD_PLF', mode: 'ALL', tense: 'ALL', output: 'chattes', confidence: 0.9997230679, timeMs: 5.06 }
{ lemma: 'beau', wordType: 'ADJE', person: 'THD_F', mode: 'ALL', tense: 'ALL', output: 'belle', confidence: 0.9999751771, timeMs: 3.08 }
{ lemma: 'manger', wordType: 'VERB', person: 'FST_PL', mode: 'INDI', tense: 'PRES', output: 'mangeons', confidence: 0.9999864523, timeMs: 4.79 }
```

## 运行测试

```bash
npm test
```

该命令会执行 test/test.js，并输出示例预测结果。

## 运行基准测试

1) 先生成检查清单 JSON（每类 100 条）：

```bash
npm run benchmark:prepare
```

2) 运行全部基准测试：

```bash
npm run benchmark
```

3) 可选：按单项运行：

```bash
npm run benchmark:lemma
npm run benchmark:noun
npm run benchmark:verb
npm run benchmark:adje
```

## 基准结果（最近一次本地运行）

基准命令：

```bash
npm run benchmark
```

结果：

- 由变位预测词元：99/100，准确率 99.00%，平均 16.46 ms
- 名词派生：99/100，准确率 99.00%，平均 17.33 ms
- 动词派生：100/100，准确率 100.00%，平均 17.12 ms
- 形容词派生：100/100，准确率 100.00%，平均 17.34 ms

## 模型体积

- 词元 ONNX 模型：models/small/lemma_type_model.int8.onnx = 0.96 MB
- 派生 ONNX 模型：models/small/derive_form_model.int8.onnx = 0.91 MB
- ONNX 总体积：约 1.87 MB

## 为什么它非常适合 Web 前端产品

- 法语关键形态任务具有高准确率
- 单次请求延迟低（本地基准平均约 16 到 17 ms）
- ONNX 体积小（总计约 1.87 MB）
- 非常适合为 Web 前端功能提供后端推理能力，例如实时写作辅助、语法提示与词元感知检索
