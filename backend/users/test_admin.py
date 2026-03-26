import pytest
from django.contrib.admin.sites import AdminSite
from django.test import RequestFactory

from users.admin import UserAdmin
from users.models import User


@pytest.mark.django_db
def test_admin_add_form_accepts_non_admin_role_user():
    request = RequestFactory().get("/admin/users/user/add/")
    request.user = User.objects.create_superuser(
        username="admin",
        email="admin@example.com",
        password="AdminPass123!",
    )

    admin = UserAdmin(User, AdminSite())
    form_class = admin.get_form(request, obj=None, change=False)

    assert "password" not in form_class.base_fields
    assert "password1" in form_class.base_fields
    assert "password2" in form_class.base_fields

    form = form_class(
        data={
            "email": "finance.user@example.com",
            "username": "finance.user@example.com",
            "name": "Finance User",
            "phone": "1234567890",
            "role": "finance",
            "status": "on",
            "is_active": "on",
            "password1": "FinancePass123!",
            "password2": "FinancePass123!",
        }
    )

    assert form.is_valid(), form.errors.as_json()
