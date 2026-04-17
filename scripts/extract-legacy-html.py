from pathlib import Path

root = Path(__file__).resolve().parent.parent
lines = (root / "index.html").read_text(encoding="utf-8").splitlines(keepends=True)
chunk = "".join(lines[27:1421])
old = '<input type="password" id="authPassword" placeholder="Password">'
new = old + "\n            <div id=\"authErrorMsg\" class=\"auth-error-msg d-none\" role=\"alert\"></div>"
if old not in chunk:
    raise SystemExit("placeholder not found")
chunk = chunk.replace(old, new, 1)
(root / "src/lib/legacy-body.html").write_text(chunk, encoding="utf-8")
print("wrote", len(chunk), "chars")
