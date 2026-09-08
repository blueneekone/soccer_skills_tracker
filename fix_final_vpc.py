with open("src/routes/(app)/parent/vpc/+page.svelte", "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if line.strip() == "</script>" and i > 600:
        lines[i] = "\t\t\t\t\t{/if}\n\t\t\t\t</div>\n\t\t\t</div>\n\t\t</div>\n\t</div>\n</div>\n"

with open("src/routes/(app)/parent/vpc/+page.svelte", "w", encoding="utf-8") as f:
    f.writelines(lines)
