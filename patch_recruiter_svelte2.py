with open("src/lib/components/recruiter/RecruiterSearchEngine.svelte", "r") as f:
    content = f.read()

import re

old_str = """	async function runSearch() {
		if (!browser) return;
		if (!isRecruiterCleared()) {
			results = [];
			return;
		}
"""

new_str = """	async function runSearch() {
		if (!db || !authStore.isAuthenticated) return;
		if (authStore.userProfile?.checkr_status !== 'clear') {
			results = [];
			return;
		}
		if (!browser) return;
		if (!isRecruiterCleared()) {
			results = [];
			return;
		}
"""

content = content.replace(old_str, new_str)

with open("src/lib/components/recruiter/RecruiterSearchEngine.svelte", "w") as f:
    f.write(content)
