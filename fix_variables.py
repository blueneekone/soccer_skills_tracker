with open("src/routes/(app)/parent/vpc/+page.svelte", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("householdId", "authStore.householdId")
content = content.replace("profile?.playerName", "authStore.profile?.playerName")
content = content.replace("profile?.email", "authStore.profile?.email")

with open("src/routes/(app)/parent/vpc/+page.svelte", "w", encoding="utf-8") as f:
    f.write(content)
