const browserGlobals = Object.fromEntries(
  [
    "Blob",
    "FileReader",
    "FormData",
    "Image",
    "Intl",
    "MutationObserver",
    "URL",
    "URLSearchParams",
    "console",
    "crypto",
    "document",
    "fetch",
    "history",
    "localStorage",
    "navigator",
    "window",
  ].map((name) => [name, "readonly"]),
);

export default [
  {
    ignores: ["node_modules/**", "supabase/.branches/**", "supabase/.temp/**"],
  },
  {
    files: ["src/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "script",
      globals: browserGlobals,
    },
    rules: {
      "no-undef": "error",
      "no-unused-vars": ["error", { argsIgnorePattern: "^_", caughtErrors: "none" }],
    },
  },
  {
    files: ["tests/*.mjs"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
    },
    rules: {
      "no-undef": "error",
      "no-unused-vars": ["error", { argsIgnorePattern: "^_", caughtErrors: "none" }],
    },
  },
];
