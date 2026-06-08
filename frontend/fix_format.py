import sys

with open('src/services/promotorService.js', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("?format=${format}", "?export_format=${format}")

with open('src/services/promotorService.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("Replacement done in promotorService.js")
