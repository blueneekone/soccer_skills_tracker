with open("firestore.rules", "r") as f:
    content = f.read()

# Add the messaging_audit match block
messaging_rule = """
    match /messaging_audit/{docId} {
      allow read: if isDirector() && resource.data.clubId == tokenClub();
    }"""

content = content.replace(
    """    match /security_audits/{document=**} {
      allow read, write: if isGlobalAdmin();
    }""",
    """    match /security_audits/{document=**} {
      allow read, write: if isGlobalAdmin();
    }""" + messaging_rule
)

with open("firestore.rules", "w") as f:
    f.write(content)
