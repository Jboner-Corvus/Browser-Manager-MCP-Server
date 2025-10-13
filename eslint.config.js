import globals from "globals";
import eslintJs from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import eslintPluginImport from "eslint-plugin-import";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";

export default [
  {
    ignores: [
      "node_modules/",
      "dist/",
      "libs/",
      "coverage/",
      "logs/",
      "*.log",
      ".vscode/",
      ".idea/",
      ".DS_Store",
      "*.env.*.local",
      ".env.local",
      "src/utils/src/utils/",
      "eslint.config.js",
      "extension/",
      "extension/**",
      "extension/build/",
      "extension/dist/",
    ]
  },
  eslintJs.configs.recommended,
  {
    files: ["src/**/*.ts"],
    plugins: {
      "@typescript-eslint": tseslint,
      import: eslintPluginImport
    },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        sourceType: "module",
        ecmaVersion: "latest"
      },
      globals: {
        ...globals.node,
        ...globals.es2022,
        ...globals.browser
      }
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_" }
      ],
      "import/no-unresolved": "error",
      "import/export": "error",
      "import/extensions": [
        "error",
        "ignorePackages",
        { ts: "never", js: "never" }
      ]
    },
    settings: {
      "import/resolver": {
        typescript: {},
        node: true
      },
      "import/parsers": {
        "@typescript-eslint/parser": [".ts", ".tsx"]
      }
    }
  },
  {
    files: ["src/**/*.ts"],
    ignores: [
      "src/**/*.test.ts",
      "src/**/*.spec.ts",
      "src/**/__tests__/**/*.ts",
      "src/utils/src/utils/**/*.ts"
    ],
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: import.meta.dirname
      }
    },
    rules: {}
  },
  {
    files: ["src/**/*.test.ts", "src/**/*.spec.ts", "src/**/__tests__/**/*.ts"],
    languageOptions: {
      globals: {
        ...globals.vitest,
        ...globals.node,
        ...globals.jest,
        NodeJS: true,
        vi: true
      }
    },
    rules: {}
  },
  eslintPluginPrettierRecommended
];
