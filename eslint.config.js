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
		files: ["**/*.svelte", "**/*.ts", "**/*.svelte.ts", "**/*.js", "**/*.cjs", "**/*.mjs"],
		rules: {
			"no-useless-escape": "off",
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
			"@typescript-eslint/no-unused-expressions": "off",
			"@typescript-eslint/no-require-imports": "off"
		}
	},
	{
		ignores: [
			"build/",
			".svelte-kit/",
			"dist/",
			"functions/",
			"functions-commerce/",
			"functions-compliance/",
			"functions-core/",
			"functions-integrations/",
			"functions-platform/",
			"functions-rl/",
			"functions-shared/",
			"legacy/",
			"scratch/",
			"playwright-report/",
			"test-results/",
			"coverage/",
			"scripts/",
			"static/",
			"recovered_log_training_session.js",
			"antigravity_persona_daemon-v2.py",
			"antigravity_persona_daemon.py",
			"admin-scripts/",
			"mock-data-down.cjs",
			"mock-data-up.cjs",
			"deploy-launch-infrastructure.cjs",
			"data.js"
		]
	}
);
