import pytest
from django.contrib.admin.sites import AdminSite
from django.test import RequestFactory

from apps.archive.admin import DocumentAdmin
from apps.archive.models import Document, License
from apps.core.models import PublicationStatus

from .factories import create_document

pytestmark = pytest.mark.django_db


@pytest.fixture
def document_admin() -> DocumentAdmin:
    return DocumentAdmin(Document, AdminSite())


@pytest.fixture
def messages_sent(rf: RequestFactory, django_user_model):
    """Request whose message storage records what the admin action reported."""
    request = rf.post("/admin/archive/document/")
    request.user = django_user_model.objects.create_superuser("editor", password="pw")
    sent: list[str] = []
    request._messages = type(
        "Storage", (), {"add": lambda self, level, message, *args, **kwargs: sent.append(message)}
    )()
    return request, sent


@pytest.fixture
def editor_client(client, django_user_model):
    django_user_model.objects.create_superuser("editor", password="pw")
    client.login(username="editor", password="pw")
    return client


def test_publish_action_skips_documents_without_license(document_admin, messages_sent):
    request, sent = messages_sent
    create_document("ready", status=PublicationStatus.DRAFT)
    create_document("no-license", status=PublicationStatus.DRAFT, license=License.UNKNOWN)

    document_admin.publish_selected(request, Document.objects.all())

    assert [d.slug for d in Document.objects.published()] == ["ready"]
    assert Document.objects.get(slug="no-license").status == PublicationStatus.DRAFT
    assert any("Ai ve Bo Lieu" in str(message) for message in sent[1:])


def test_unpublish_action_moves_documents_back_to_draft(document_admin, messages_sent):
    request, _ = messages_sent
    create_document()

    document_admin.unpublish_selected(request, Document.objects.all())

    assert Document.objects.published().count() == 0


def test_change_form_has_glossary_inline(editor_client):
    document = create_document()

    response = editor_client.get(f"/admin/archive/document/{document.pk}/change/")

    assert response.status_code == 200
    assert "glossary-group" in response.content.decode()


def test_change_form_refuses_to_publish_unknown_license(editor_client):
    response = editor_client.post(
        "/admin/archive/document/add/",
        {
            "slug": "cau-ca-dao",
            "title": "Cau ca dao",
            "genre": "folk_verse",
            "body": "Noi dung",
            "grade_level": "all",
            "source": "Dia chi Quang Tri",
            "license": License.UNKNOWN,
            "status": PublicationStatus.PUBLISHED,
            "glossary-TOTAL_FORMS": "0",
            "glossary-INITIAL_FORMS": "0",
        },
    )

    assert response.status_code == 200  # form re-rendered with errors
    assert not Document.objects.exists()


def test_changelist_and_theme_admin_render(editor_client):
    create_document()

    assert editor_client.get("/admin/archive/document/").status_code == 200
    assert editor_client.get("/admin/archive/theme/").status_code == 200
