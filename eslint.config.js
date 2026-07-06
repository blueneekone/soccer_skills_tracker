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
		files: ["**/*.ts", "**/*.svelte.ts"],
		languageOptions: {
			parser: ts.parser,
			parserOptions: {
				ecmaVersion: 2020,
				sourceType: "module"
			}
		}
	},
	{
		files: ["**/*.svelte", "**/*.ts", "**/*.svelte.ts", "**/*.js"],
		rules: {
			"max-lines-per-function": ["warn", { "max": 95, "skipBlankLines": true, "skipComments": true }],
			"svelte/valid-prop-names-in-kit-pages": "off",
			"svelte/no-navigation-without-resolve": "off",
			"svelte/require-each-key": "off",
			"@typescript-eslint/no-unused-vars": "off",
			"@typescript-eslint/no-explicit-any": "off",
			"no-useless-assignment": "off",
			"svelte/prefer-svelte-reactivity": "off",
			"svelte/no-unused-svelte-ignore": "off",
			"svelte/no-useless-children-snippet": "off",
			"@typescript-eslint/no-unused-expressions": "off"
		}
	},
	{
		ignores: ["build/", ".svelte-kit/", "dist/", "functions/", "playwright-report/", "test-results/", "coverage/", "scripts/", "static/"]
	}
);
