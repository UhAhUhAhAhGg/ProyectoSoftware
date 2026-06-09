import sys

with open('events/views.py', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("request.query_params.get('format', 'csv')", "request.query_params.get('export_format', 'csv')")
content = content.replace("request.query_params.get('format','csv')", "request.query_params.get('export_format','csv')")

with open('events/views.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("Replacement done in views.py")
