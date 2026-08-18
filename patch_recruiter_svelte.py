with open("src/lib/components/recruiter/RecruiterSearchEngine.svelte", "r") as f:
    content = f.read()

# At the very top of the search trigger function, inject an early-return evaluation alongside your B815 defensive hydration guard. If the authenticated recruiter's profile status (e.g., authStore.userProfile?.checkr_status) is not strictly equal to 'clear', the function must abort and return an empty result state.

import re

# Find runSearch function
# async function runSearch() {
# 		if (!db || !authStore.isAuthenticated) return;
# 		loading = true;

old_str = """	async function runSearch() {
		if (!db || !authStore.isAuthenticated) return;
"""

new_str = """	async function runSearch() {
		if (!db || !authStore.isAuthenticated) return;
		if (authStore.userProfile?.checkr_status !== 'clear') {
			results = [];
			return;
		}
"""

content = content.replace(old_str, new_str)

with open("src/lib/components/recruiter/RecruiterSearchEngine.svelte", "w") as f:
    f.write(content)
