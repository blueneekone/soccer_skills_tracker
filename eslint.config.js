import js from "@eslint/js";
import svelte from "eslint-plugin-svelte";
import globals from "globals";
import ts from "typescript-eslint";
import svelteParser from "svelte-eslint-parser";

export default ts.config(
	js.configs.recommended,
	...ts.configs.recommended,
	...svelte.configs["flat/recommended"],
	{
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.node
			}
		}
	},
	{
		files: ["**/*.svelte"],
		languageOptions: {
			parser: svelteParser,
			parserOptions: {
				parser: ts.parser,
				extraFileExtensions: [".svelte"]
			}
		}
	},
	{
		files: ["**/*.svelte", "**/*.ts", "**/*.js"],
		rules: {
			"max-lines-per-function": ["error", { "max": 80, "skipBlankLines": true, "skipComments": true }],
			"svelte/valid-prop-names-in-kit-pages": "off",
			"svelte/no-navigation-without-resolve": "off",
			"svelte/require-each-key": "off"
		}
	},
	{
		ignores: ["build/", ".svelte-kit/", "dist/", "functions/", "playwright-report/", "test-results/", "coverage/", "scripts/", "static/"]
	}
);
