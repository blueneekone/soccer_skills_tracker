with open('src/routes/(app)/parent/vpc/+page.svelte', 'r') as f:
    content = f.read()

# Add missing derived state
missing_state = """
	const profile = $derived(authStore.userProfile);
	const householdId = $derived(profile?.householdId ? String(profile.householdId) : '');
"""

content = content.replace("let activePlayerEmail = $state('');", "let activePlayerEmail = $state('');\n" + missing_state)

with open('src/routes/(app)/parent/vpc/+page.svelte', 'w') as f:
    f.write(content)
