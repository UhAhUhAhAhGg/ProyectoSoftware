import requests
import json

# Login
login_r = requests.post(
    'http://localhost:8000/api/v1/users/login/',
    json={'email': 'admin@ticketproject.com', 'password': 'Admin1234!'}
)
token = login_r.json()['access']
admin_id = login_r.json()['id']

print('Admin Token retrieved OK')

# Get all users to find one to suspend
users_r = requests.get(
    'http://localhost:8000/api/v1/users/',
    headers={'Authorization': f'Bearer {token}'}
)
all_users = users_r.json()
print(f'Found users')

# Find a Comprador to suspend (not admin)
comprador_user = None
if 'results' in all_users:
    users_list = all_users['results']
else:
    users_list = all_users if isinstance(all_users, list) else []

for user in users_list:
    if user.get('role') == 'Comprador' and user.get('id') != admin_id:
        comprador_user = user
        break

if comprador_user:
    user_id = comprador_user['id']
    email = comprador_user['email']
    print(f'Testing suspend on: {email}')
    
    # Test 1: Suspend without motivo (should fail)
    print(f'\nTEST 1: Suspend without motivo')
    r1 = requests.patch(
        f'http://localhost:8000/api/v1/admin/users/{user_id}/suspend/',
        json={'motivo': ''},
        headers={'Authorization': f'Bearer {token}'}
    )
    print(f'Status: {r1.status_code}')
    print(json.dumps(r1.json(), indent=2))
    
    # Test 2: Suspend with short motivo (should fail)
    print(f'\nTEST 2: Suspend with short motivo')
    r2 = requests.patch(
        f'http://localhost:8000/api/v1/admin/users/{user_id}/suspend/',
        json={'motivo': 'short'},
        headers={'Authorization': f'Bearer {token}'}
    )
    print(f'Status: {r2.status_code}')
    print(json.dumps(r2.json(), indent=2))
    
    # Test 3: Suspend with valid motivo (should succeed)
    print(f'\nTEST 3: Suspend with valid motivo')
    r3 = requests.patch(
        f'http://localhost:8000/api/v1/admin/users/{user_id}/suspend/',
        json={'motivo': 'Comportamiento inapropiado en la plataforma durante actividades sospechosas'},
        headers={'Authorization': f'Bearer {token}'}
    )
    print(f'Status: {r3.status_code}')
    print(json.dumps(r3.json(), indent=2))
    
    # Test 4: Try to suspend again (should fail - already suspended)
    print(f'\nTEST 4: Try to suspend already suspended user')
    r4 = requests.patch(
        f'http://localhost:8000/api/v1/admin/users/{user_id}/suspend/',
        json={'motivo': 'Another suspension attempt'},
        headers={'Authorization': f'Bearer {token}'}
    )
    print(f'Status: {r4.status_code}')
    print(json.dumps(r4.json(), indent=2))
else:
    print('No Comprador user found to test suspension')
