with open("src/lib/services/__tests__/commsSprint42.test.ts", "r") as f:
    content = f.read()

content = content.replace(
    r"const src = readFileSync(join(ROOT, 'components', 'coach', 'NewMessageEngine.svelte.ts'), 'utf-8');",
    r"const src = readFileSync(join(ROOT, 'components/coach/NewMessageEngine.svelte.ts'), 'utf-8');"
)

with open("src/lib/services/__tests__/commsSprint42.test.ts", "w") as f:
    f.write(content)
