import js from "@eslint/js";
import globals from "globals";

export default [
  {
    files: ["src/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.node,
        ...globals.serviceworker
      }
    },
    rules: {
      ...js.configs.recommended.rules,
      "no-unused-vars": "warn",
      "no-console": "warn",
      "prefer-const": "error",
      "no-var": "error",
      "eqeqeq": "error",
      "curly": "error",
      "semi": ["error", "always"],
      "quotes": ["error", "single"],
      "indent": ["error", 2],
      "comma-dangle": ["error", "never"],
      "object-curly-spacing": ["error", "always"],
      "array-bracket-spacing": ["error", "never"],
      "space-before-function-paren": ["error", "never"],
      "space-before-blocks": "error",
      "keyword-spacing": "error",
      "space-infix-ops": "error"
    }
  },
  {
    files: ["**/*.test.js", "**/*.spec.js"],
    languageOptions: {
      globals: {
        ...globals.jest
      }
    }
  }
];