const order = require('./order');

const bemSelector = (block, presetOptions) => {
  const ns =
    presetOptions && presetOptions.namespace
      ? `${presetOptions.namespace}-`
      : '';
  const WORD = '[a-zA-Z0-9]+(?:-[a-zA-Z0-9]+)*';
  const element = `(?:__${WORD})?`;
  const modifier = `(?:_${WORD}){0,2}`;
  const attribute = '(?:\\[.+\\])?';
  return new RegExp(`^\\.${ns}${block}${element}${modifier}${attribute}$`);
};

module.exports = {
  extends: ['stylelint-config-standard-scss', 'stylelint-prettier/recommended'],
  plugins: [
    'stylelint-order',
    'stylelint-scss',
    'stylelint-selector-bem-pattern',
  ],
  rules: {
    'selector-class-pattern': [
      '^[a-z]([-]?[a-z0-9]+)*(__[a-z0-9]([-]?[a-z0-9]+)*)?(_[a-z0-9]([-]?[a-z0-9]+)*){0,2}$',
      {
        /** This option will resolve nested selectors with & interpolation. - https://stylelint.io/user-guide/rules/selector-class-pattern/#resolvenestedselectors-true--false-default-false */
        resolveNestedSelectors: true,
        /** Custom message */
        message: function expected(selectorValue) {
          return `Cелектор класса: "${selectorValue}", должен соответствовать методологии БЭМ. Соглашение по именованию селекторов: https://ru.bem.info/methodology/naming-convention/`;
        },
      },
    ],
    'at-rule-no-unknown': null,
    'scss/at-rule-no-unknown': true,
    'plugin/selector-bem-pattern': {
      preset: 'bem',
      componentSelectors: bemSelector,
    },
    ...order.rules,
  },
  ignoreFiles: ['src/app/styles/normalize.css', 'build/**/*', 'docs/**/*'],
};
