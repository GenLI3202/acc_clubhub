"""
Tests for send_confirmation_email — focuses on QR code URL construction.
No actual emails are sent (RESEND_API_KEY is empty in test env).
"""

from datetime import datetime, timezone
from unittest.mock import MagicMock, patch

import pytest
from services.email import send_confirmation_email

SAMPLE_DATE = datetime(2026, 4, 19, 9, 0, tzinfo=timezone.utc)
FRONTEND_URL = "https://www.across-cc.de"


def _capture_email_params(**kwargs) -> dict:
    """Call send_confirmation_email and capture the params passed to resend."""
    captured = {}

    mock_send = MagicMock(return_value={"id": "test-id"})

    with patch("resend.Emails.send", mock_send), \
         patch("services.email.settings") as mock_settings:
        mock_settings.RESEND_API_KEY = "test-key"
        mock_settings.PUBLIC_FRONTEND_URL = FRONTEND_URL

        send_confirmation_email(**kwargs)

    assert mock_send.called, "resend.Emails.send was not called"
    captured = mock_send.call_args[0][0]  # first positional arg = params dict
    return captured


def test_qr_code_relative_path_becomes_absolute():
    """Relative /images/... path must be prefixed with the frontend URL."""
    params = _capture_email_params(
        user_email="test@example.com",
        user_name="Test User",
        event_title="ACC 2026 开春咖啡骑",
        event_date=SAMPLE_DATE,
        wechat_qr_code="/images/uploads/event_src/2026-season-opening/qr.png",
    )
    assert f'{FRONTEND_URL}/images/uploads/event_src/2026-season-opening/qr.png' in params["html"]


def test_qr_code_absolute_url_used_as_is():
    """Absolute https:// URL must not be double-prefixed."""
    abs_url = "https://cdn.example.com/qr.png"
    params = _capture_email_params(
        user_email="test@example.com",
        user_name="Test User",
        event_title="ACC 2026 开春咖啡骑",
        event_date=SAMPLE_DATE,
        wechat_qr_code=abs_url,
    )
    assert f'src="{abs_url}"' in params["html"]
    assert f'src="{FRONTEND_URL}{abs_url}"' not in params["html"]


def test_no_qr_code_omits_img_tag():
    """When wechat_qr_code is None, no <img> tag should appear in the email."""
    params = _capture_email_params(
        user_email="test@example.com",
        user_name="Test User",
        event_title="ACC 2026 开春咖啡骑",
        event_date=SAMPLE_DATE,
        wechat_qr_code=None,
    )
    assert "WeChat QR Code" not in params["html"]
    assert "<img" not in params["html"]


@pytest.mark.parametrize(
    ("lang", "label"),
    [
        ("zh", "查看 Komoot 路线"),
        ("en", "View route on Komoot"),
        ("de", "Route auf Komoot ansehen"),
    ],
)
def test_route_link_is_localized_and_html_safe(
    lang: str,
    label: str,
) -> None:
    """A supplied Komoot route appears as a localized safe link."""
    route_url = (
        "https://www.komoot.com/de-de/tour/3200651827"
        "?share_token=test-token&ref=wtd"
    )

    params = _capture_email_params(
        user_email="test@example.com",
        user_name="Test User",
        event_title="Test Ride",
        event_date=SAMPLE_DATE,
        lang=lang,
        route_komoot_url=route_url,
    )

    assert label in params["html"]
    assert (
        'href="https://www.komoot.com/de-de/tour/3200651827'
        '?share_token=test-token&amp;ref=wtd"'
    ) in params["html"]


def test_no_route_omits_komoot_link() -> None:
    """Confirmation emails without a route omit the Komoot section."""
    params = _capture_email_params(
        user_email="test@example.com",
        user_name="Test User",
        event_title="Test Ride",
        event_date=SAMPLE_DATE,
        route_komoot_url=None,
    )

    assert "komoot.com" not in params["html"]
