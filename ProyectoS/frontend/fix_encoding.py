import pathlib
p = pathlib.Path(r'c:\Users\Gustavo\Documents\UCB\Taller de Desarrollo de Software\Project\ProyectoSoftware\frontend\src\pages\AdminDashboard.jsx')
text = p.read_text(encoding='utf-8')
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
    '≡ƒÆ░': '💰'
}
for k, v in replacements.items():
    text = text.replace(k, v)
p.write_text(text, encoding='utf-8')
print('Fixed encoding in AdminDashboard.jsx')
