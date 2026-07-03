import js from "@eslint/js";
import svelte from "eslint-plugin-svelte";
import ts from "typescript-eslint";

export default ts.config(
	js.configs.recommended,
	...ts.configs.recommended,
	...svelte.configs["flat/recommended"],
	{
		files: ["**/*.svelte", "**/*.ts", "**/*.js"],
		rules: {
			"max-lines-per-function": ["error", { "max": 80, "skipBlankLines": true, "skipComments": true }]
		}
	},
	{
		ignores: ["build/", ".svelte-kit/", "dist/"]
	}
);
