---
base_model: facebook/nllb-200-distilled-600M
library_name: transformers.js
pipeline_tag: translation
---

https://huggingface.co/facebook/nllb-200-distilled-600M with ONNX weights to be compatible with Transformers.js.

## Usage (Transformers.js)

If you haven't already, you can install the [Transformers.js](https://huggingface.co/docs/transformers.js) JavaScript library from [NPM](https://www.npmjs.com/package/@xenova/transformers) using:

```bash
npm i @xenova/transformers
```

You can then perform multilingual translation like this:

```js
import { pipeline } from '@xenova/transformers';

// Create a translation pipeline
const translator = await pipeline(
  'translation',
  'Xenova/nllb-200-distilled-600M'
);

// Translate text from Hindi to French
const output = await translator('जीवन एक चॉकलेट बॉक्स की तरह है।', {
  src_lang: 'hin_Deva', // Hindi
  tgt_lang: 'fra_Latn', // French
});
console.log(output);
// [{ translation_text: 'La vie est comme une boîte à chocolat.' }]
```

See [here](https://github.com/facebookresearch/flores/blob/main/flores200/README.md#languages-in-flores-200) for the full list of languages and their corresponding codes.

---

Note: Having a separate repo for ONNX weights is intended to be a temporary solution until WebML gains more traction. If you would like to make your models web-ready, we recommend converting to ONNX using [🤗 Optimum](https://huggingface.co/docs/optimum/index) and structuring your repo like this one (with ONNX weights located in a subfolder named `onnx`).
