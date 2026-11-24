import firebaseRulesPlugin from "@firebase/eslint-plugin-security-rules";

export default [
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "public/**",
      "src/**",
      "scripts/**",
      "server.ts",
    ],
  },
  firebaseRulesPlugin.configs["flat/recommended"],
];
