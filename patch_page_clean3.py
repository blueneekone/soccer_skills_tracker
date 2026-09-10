with open('src/routes/(app)/parent/vpc/+page.svelte', 'r') as f:
    content = f.read()

content = content.replace("	import { VpcEngine } from './VpcEngine.svelte';\n", "")
content = content.replace("	const engine = new VpcEngine();\n", "")

with open('src/routes/(app)/parent/vpc/+page.svelte', 'w') as f:
    f.write(content)
