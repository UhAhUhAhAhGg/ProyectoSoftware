import csv

with open('Jira.csv', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    stories = {}
    for row in reader:
        # Check if it's in Sprint 1
        sprint = row.get('Sprint', '')
        if 'Sprint 1' in sprint:
            issue_type = row.get('Tipo de Incidencia', '')
            if issue_type.lower() in ['historia', 'tarea', 'epic'] or True: # Capture parents
                parent_key = row.get('Clave principal', '')
                if parent_key:
                    if parent_key not in stories:
                        stories[parent_key] = {'summary': row.get('Parent summary', ''), 'subtasks': [], 'status': row.get('Estado')}
                    stories[parent_key]['subtasks'].append({
                        'key': row['Clave de incidencia'],
                        'summary': row['Resumen'],
                        'status': row['Estado']
                    })
                else: # It's a main issue or epic
                    key = row['Clave de incidencia']
                    if key not in stories:
                        stories[key] = {'summary': row['Resumen'], 'subtasks': [], 'status': row['Estado']}

    print(f"Encontradas {len(stories)} historias/tareas principales en el Sprint 1:")
    for key, data in sorted(stories.items(), key=lambda x: int(x[0].split('-')[1]) if '-' in x[0] and x[0].split('-')[1].isdigit() else 0):
        total = len(data['subtasks'])
        done = sum(1 for s in data['subtasks'] if s['status'].lower() in ['completado', 'done', 'cerrado', 'listo'])
        print(f"{key}: {data['summary']} ({done}/{total} subtareas completadas)")
