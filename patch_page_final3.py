with open('src/routes/(app)/parent/vpc/+page.svelte', 'r') as f:
    content = f.read()

content = content.replace("</script>\n\n\n</script>", "</script>")

with open('src/routes/(app)/parent/vpc/+page.svelte', 'w') as f:
    f.write(content)
