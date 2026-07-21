import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

/**
 * @typedef {{ id: string, data: Record<string, unknown>, email: string | null, uid: string | null }} Row
 */

/**
 * Format a document for display to the user.
 * @param {Row} row
 * @param {number} index
 * @returns {string}
 */
export function formatDocForDisplay(row, index) {
	const docData = JSON.stringify(row.data, null, 2);
	return `\n[${index + 1}] ID: ${row.id}\nUID Field: ${row.uid || '(unset)'}\nData:\n${docData}\n`;
}

/**
 * Prompts the user to manually select a winning document from a list.
 * @param {string} email - The email bucket being processed
 * @param {Row[]} list - The list of duplicate documents
 * @returns {Promise<Row | null>} The selected document or null if skipped
 */
export async function promptUserForWinner(email, list) {
	console.log(`\n\u001b[33m⚠ Manual Intervention Required\u001b[0m`);
	console.log(`Could not automatically resolve a survivor for ${email}.`);
	console.log(`Please select the correct document to keep:\n`);

	let displayStr = '';
	for (let i = 0; i < list.length; i++) {
		displayStr += formatDocForDisplay(list[i], i);
	}
	console.log(displayStr);

	const rl = readline.createInterface({ input, output });

	try {
		while (true) {
			const answer = await rl.question(
				`Enter the number of the document to keep (1-${list.length}), or 's' to skip: `
			);

			const trimmed = answer.trim().toLowerCase();
			if (trimmed === 's') {
				console.log(`Skipping group for ${email}.`);
				return null;
			}

			const num = parseInt(trimmed, 10);
			if (!isNaN(num) && num >= 1 && num <= list.length) {
				const winner = list[num - 1];
				console.log(`\nYou selected document [${num}] with ID: ${winner.id}`);
				return winner;
			} else {
				console.log(`Invalid input. Please enter a number between 1 and ${list.length}, or 's' to skip.`);
			}
		}
	} finally {
		rl.close();
	}
}
