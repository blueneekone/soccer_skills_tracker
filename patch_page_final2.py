with open('src/routes/(app)/parent/vpc/+page.svelte', 'r') as f:
    content = f.read()

# Make sure submitConsent is passed properly
# Wait, $state.snapshot is required. Let's make sure it's used inside the page.svelte script

content = content.replace(
    r"const parentGrantVpcConsentFn = httpsCallable(functions, 'parentGrantVpcConsent');\n\t\t\tawait parentGrantVpcConsentFn(payload);",
    r"const parentGrantVpcConsentFn = httpsCallable(functions, 'parentGrantVpcConsent');\n\t\t\tawait parentGrantVpcConsentFn($state.snapshot(payload));"
)

# And let's check `if (!db || !authStore.isAuthenticated) return;` which is present at line 54

with open('src/routes/(app)/parent/vpc/+page.svelte', 'w') as f:
    f.write(content)
