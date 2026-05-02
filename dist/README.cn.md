# FR-SPELL

[English](README.md) | [中文](README.cn.md) | [Français](README.fr.md)

FR-SPELL 是一个用于法语词形还原与派生形态生成的 npm 包。
支持能力如下：

- 将动词变位形式预测为词元（lemma）
- 名词词形生成
- 形容词词形生成
- 动词词形生成

该包基于 ONNX Runtime 与 INT8 量化模型，兼顾高速度与小体积。

## 安装

```bash
npm install fr-spell
```

## 集成到你的项目

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

示例运行输出：

```txt
{ input: 'mangeons', lemma: 'manger', wordType: 'VERB', confidence: 0.9965604285, timeMs: 3.89 }
{ lemma: 'chat', wordType: 'NOUN', person: 'THD_PLF', mode: 'ALL', tense: 'ALL', output: 'chattes', confidence: 0.9997230679, timeMs: 5.06 }
{ lemma: 'beau', wordType: 'ADJE', person: 'THD_F', mode: 'ALL', tense: 'ALL', output: 'belle', confidence: 0.9999751771, timeMs: 3.08 }
{ lemma: 'manger', wordType: 'VERB', person: 'FST_PL', mode: 'INDI', tense: 'PRES', output: 'mangeons', confidence: 0.9999864523, timeMs: 4.79 }
```

## 浏览器用法

直接使用本包内的浏览器 Bundle 与模型资源：

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

## 预测参数说明

词元预测（lemma）：

- API：`predictor.lemma(input)`
- `input`：字符串，输入变位/屈折后的词形，例如 `mangeons`

派生预测（derive）：

- 名词 API：`predictor.nounDerive(lemma, person)`
- 形容词 API：`predictor.adjeDerive(lemma, person)`
- 动词 API：`predictor.verbDerive(lemma, person, mode, tense)`
- 通用 API：`predictor.derive(lemma, wordType, person, mode, tense)`

可用 `wordType`：

- `NOUN`（名词）
- `ADJE`（形容词）
- `VERB`（动词）

可用 `person`：

- `FST`（第一人称单数）
- `SND`（第二人称单数）
- `THD_M`（第三人称阳性单数）
- `THD_F`（第三人称阴性单数）
- `FST_PL`（第一人称复数）
- `SND_PL`（第二人称复数）
- `THD_PLM`（第三人称阳性复数）
- `THD_PLF`（第三人称阴性复数）

可用 `mode`：

- `INDI`（陈述式）
- `SUBJ`（虚拟式）
- `COND`（条件式）
- `PART`（分词式）
- `IMPE`（命令式）
- `INFI`（不定式）

当前实现支持的 `tense` 仅有：

- `PRES`（现在时）
- `IMPA`（未完成过去时）
- `FUTU`（将来时）
- `PASS`（过去时）

说明：

- 参考定义文件中还有更多时态名称，但本包实现目前只支持 `PRES`、`IMPA`、`FUTU`、`PASS`。
- 对于名词/形容词派生，用户输入时不需要 `mode` 与 `tense`。

## 查看帮助

```bash
npm run help
```

该命令会输出参数速查说明，覆盖 `lemma`、`nounDerive`、`adjeDerive`、`verbDerive`、`derive` 及 person/mode/tense 可用值。

## 基准结果（最近一次本地运行）

结果：

- 由变位预测词元：97/100，准确率 97.00%，平均 22.21 ms
- 名词派生：100/100，准确率 100.00%，平均 23.46 ms
- 动词派生：100/100，准确率 100.00%，平均 23.18 ms
- 形容词派生：100/100，准确率 100.00%，平均 23.49 ms

## 模型体积

- 当前默认（community）词元 ONNX 模型：models/community/lemma_type_model.int8.onnx = 1.48 MB
- 当前默认（community）派生 ONNX 模型：models/community/derive_form_model.int8.onnx = 1.40 MB
- 当前默认 ONNX 总体积：约 2.88 MB

Mini 版本说明：

- mini 词元 ONNX 模型目标大小：0.96 MB
- mini 派生 ONNX 模型目标大小：0.91 MB
- mini ONNX 总体积目标：约 1.87 MB
- mini 模型版本将很快上线。

## 为什么它非常适合 Web 前端产品

- 法语关键形态任务具有高准确率
- 单次请求延迟低（最新本地基准平均约 22 到 23 ms）
- 当前默认 ONNX 体积紧凑（约 2.88 MB），更小的 mini 模型包（约 1.87 MB）即将上线
- 非常适合为 Web 前端功能提供后端推理能力，例如实时写作辅助、语法提示与词元感知检索
