import pathlib

directory = pathlib.Path(r'c:\Users\Gustavo\Documents\UCB\Taller de Desarrollo de Software\Project\ProyectoSoftware\frontend\src')
files = list(directory.rglob('*.jsx')) + list(directory.rglob('*.css'))

replacements = {
    '├│': 'ó',
    '├¡': 'í',
    '┬í': '¡',
    '┬⌐': '©',
    '├ù': '×',
    '≡ƒæÑ': '👥',
    '≡ƒôó': '📢',
    '≡ƒ¢ì∩╕Å': '🛍️',
    'ΓÜÖ∩╕Å': '⚙️',
    '≡ƒôà': '📅',
    '≡ƒôï': '📋',
    '≡ƒÄ½': '🎫',
    '≡ƒÜ¬': '🚪',
    'Γÿ░': '☰',
    '≡ƒÆ░': '💰',
    'M├ôDULOS': 'MÓDULOS'
}

count = 0
for p in files:
    try:
        text = p.read_text(encoding='utf-8')
        changed = False
        for k, v in replacements.items():
            if k in text:
                text = text.replace(k, v)
                changed = True
        
        if changed:
            p.write_text(text, encoding='utf-8')
            print(f"Fixed {p.name}")
            count += 1
    except Exception as e:
        print(f"Skipped {p.name}: {e}")

print(f"Fixed encoding in {count} files")
