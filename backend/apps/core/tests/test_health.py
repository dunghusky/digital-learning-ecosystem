from django.urls import reverse
from rest_framework.test import APIClient


def test_health_check_is_public() -> None:
    response = APIClient().get(reverse("health-check"))

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
