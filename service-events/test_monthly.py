import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'events_config.settings')
django.setup()

from events.views import PromotorDashboardSummaryView
from rest_framework.test import APIRequestFactory

factory = APIRequestFactory()
request = factory.get('/api/v1/promotor/dashboard/summary/')

class DummyUser:
    id = 'bf84d24d-186f-4c9a-bd1a-bfaeb5226006'
    is_authenticated = True

request.user = DummyUser()
view = PromotorDashboardSummaryView.as_view()
response = view(request)
print(response.data)
