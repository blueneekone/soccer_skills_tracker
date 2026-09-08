import re

with open("local_platform_healer.py", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("for prop in ['onClose', 'onAdvance']:", "for prop in ['onClose', 'onAdvance', 'close']:")

with open("local_platform_healer.py", "w", encoding="utf-8") as f:
    f.write(content)
