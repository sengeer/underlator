import pluginN from "eslint-plugin-n";
import globals from "globals";

export default [
  {
    ignores: ["node_modules", "out", "src/assets"],
  },
  {
    files: ["**/*.js"],
    plugins: {
      n: pluginN,
    },
    languageOptions: {
        globals: {
            ...globals.browser,
            ...globals.node,
        }
    },
    rules: {
      ...pluginN.configs["recommended-script"].rules,
      "n/no-unsupported-features/es-syntax": ["error", {
        "version": ">=18.18.2",
        "ignores": []
      }],
      "n/no-unpublished-require": "off"
    },
  }
];
