with open("src/lib/services/__tests__/commsSprint42.test.ts", "r") as f:
    content = f.read()

content = content.replace(
    r"const src = readFileSync(join(ROOT, 'coach', 'NewMessageEngine.svelte.ts'), 'utf-8');",
    r"const src = readFileSync(join(ROOT, 'components', 'coach', 'NewMessageEngine.svelte.ts'), 'utf-8');"
)
# Let's check what ROOT is.
# const ROOT = join(__dirname, '..', '..');
# __dirname is src/lib/services/__tests__
# ROOT is src/lib
# So join(ROOT, 'components', 'coach', 'NewMessageEngine.svelte.ts') is src/lib/components/coach/NewMessageEngine.svelte.ts. It failed with ENOENT.
