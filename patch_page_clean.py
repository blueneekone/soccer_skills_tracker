import re

with open('src/routes/(app)/parent/vpc/+page.svelte', 'r') as f:
    content = f.read()

# Remove the accidental 'engine.load()' I put in
content = content.replace('\t$effect(() => {\n\t\tengine.load();\n\t});\n', '')

with open('src/routes/(app)/parent/vpc/+page.svelte', 'w') as f:
    f.write(content)
