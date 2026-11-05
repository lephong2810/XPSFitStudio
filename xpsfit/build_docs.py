"""Stamp a new app version into docs/sw.js so installed apps pick up updates.
Run after editing any file in docs/:   python xpsfit/build_docs.py"""
import hashlib
import re
from pathlib import Path

docs = Path(__file__).parent / "docs"
h = hashlib.sha1()
for name in ["index.html", "styles.css", "fonts.css", "i18n.js", "core.js", "app.js", "manifest.webmanifest"]:
    h.update((docs / name).read_bytes())
version = h.hexdigest()[:10]
sw = docs / "sw.js"
sw.write_text(re.sub(r'const VERSION = "[^"]*";', f'const VERSION = "{version}";', sw.read_text(encoding="utf-8")), encoding="utf-8")
(docs / ".nojekyll").write_text("")
print(f"docs/ updated (version {version}). Commit and push to GitHub.")
