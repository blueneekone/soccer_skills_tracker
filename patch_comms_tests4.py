with open("firestore.rules", "r") as f:
    content = f.read()

incident_rule = """
    match /message_incidents/{incidentId} {
      allow read, write: if isDirector() && resource.data.clubId == tokenClub();
    }"""

content = content.replace(
    """    match /security_audits/{document=**} {
      allow read, write: if isGlobalAdmin();
    }""",
    """    match /security_audits/{document=**} {
      allow read, write: if isGlobalAdmin();
    }""" + incident_rule
)

with open("firestore.rules", "w") as f:
    f.write(content)

with open("src/lib/services/__tests__/commsSprint42.test.ts", "r") as f:
    content2 = f.read()

content2 = content2.replace(
    r"const src = readFileSync(join(ROOT, 'components', 'comms', 'NewMessageEngine.svelte.ts'), 'utf-8');",
    r"const src = readFileSync(join(ROOT, 'components', 'coach', 'NewMessageEngine.svelte.ts'), 'utf-8');"
)

with open("src/lib/services/__tests__/commsSprint42.test.ts", "w") as f:
    f.write(content2)

with open("src/lib/services/__tests__/commsSprint410.test.ts", "r") as f:
    content3 = f.read()

content3 = content3.replace(
    r"expect(True).toBe(True); // Dummy replacement",
    r"expect(rules).toMatch(/match \/message_incidents\/\{incidentId\}/);"
)
content3 = content3.replace(
    r"// dummy",
    r"expect(rules).toMatch(/resource\.data\.clubId == tokenClub\(\)/);"
)

with open("src/lib/services/__tests__/commsSprint410.test.ts", "w") as f:
    f.write(content3)
