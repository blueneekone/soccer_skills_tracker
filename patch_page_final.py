with open('src/routes/(app)/parent/vpc/+page.svelte', 'r') as f:
    content = f.read()

# Make sure to import the components
import_statement = """
	import VpcStep1Disclosure from '$lib/components/compliance/VpcStep1Disclosure.svelte';
	import VpcStep2Assertions from '$lib/components/compliance/VpcStep2Assertions.svelte';
	import VpcStep3Attestation from '$lib/components/compliance/VpcStep3Attestation.svelte';
"""

content = content.replace("import '$lib/styles/parent-vpc-trust-band.css';", "import '$lib/styles/parent-vpc-trust-band.css';" + import_statement)

with open('src/routes/(app)/parent/vpc/+page.svelte', 'w') as f:
    f.write(content)
