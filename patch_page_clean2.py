with open('src/routes/(app)/parent/vpc/+page.svelte', 'r') as f:
    content = f.read()

content = content.replace("	import VpcArena from './VpcArena.svelte';\n", "")
content = content.replace("<VpcArena {engine} />\n", "")

with open('src/routes/(app)/parent/vpc/+page.svelte', 'w') as f:
    f.write(content)
