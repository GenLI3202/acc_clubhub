"""Transactional emails retain personal details and readable text alternatives."""

from datetime import datetime, timezone
from html import unescape
from unittest.mock import patch

import pytest
from services.email import (
    send_confirmation_email,
    send_event_rescheduling_email,
    send_subscription_confirmation_email,
)


@pytest.mark.parametrize("kind", ["confirmation", "subscription", "reschedule"])
@pytest.mark.parametrize("lang", ["zh", "en", "de"])
def test_email_cards_preserve_names_signature_and_plain_text(
    kind: str,
    lang: str,
) -> None:
    with (
        patch("services.email.settings") as settings,
        patch("services.email.resend.Emails.send", return_value={"id": "test"}) as send,
    ):
        settings.RESEND_API_KEY = "test"
        settings.PUBLIC_FRONTEND_URL = "https://www.across-cc.de"
        if kind == "subscription":
            send_subscription_confirmation_email(
                "lin@example.com",
                "Lin <Chen>",
                lang,
                "test-token",
            )
        else:
            common = {
                "user_email": "lin@example.com",
                "user_name": "Lin <Chen>",
                "event_title": "Isar & Friends",
                "event_slug": "isar-ride",
                "event_date": datetime(2030, 7, 7, 7, 30, tzinfo=timezone.utc),
                "event_location": "Museum <Square>",
            }
            if kind == "confirmation":
                send_confirmation_email(**common, lang=lang)
            else:
                send_event_rescheduling_email(
                    **common,
                    previous_event_date=datetime(
                        2030,
                        7,
                        6,
                        7,
                        tzinfo=timezone.utc,
                    ),
                    reason="weather",
                )
    params = send.call_args.args[0]
    html, text = params["html"], params["text"]
    assert "Lin &lt;Chen&gt;" in html
    assert "Lin <Chen>" in text
    for phrase in [
        "Let's Ride, Free and Together",
        "Across Paths · Mountains · Borders",
    ]:
        assert phrase in unescape(html) and phrase in text
    assert 'alt="穿越无疆"' in html and "穿越无疆" in text
    assert 'role="presentation"' in html
    assert "#C62828" in html and "#2A5CA6" not in html
    assert "<ul" not in html and "<li" not in html
    assert "Example Rider" not in html and "到时见" not in html
    if kind != "subscription":
        assert "2030-07-07 09:30 CEST" in html
        assert "Museum &lt;Square&gt;" in html
        assert "2030-07-07 09:30 CEST" in text
    if kind == "reschedule":
        assert "2030-07-06 09:00 CEST" in html
        assert "adverse weather" in html
        assert "registration status is unchanged" in text
    if kind == "subscription":
        assert "/api/unsubscribe/test-token" in html
        assert "/api/unsubscribe/test-token" in text
    if kind == "confirmation" and lang == "zh":
        assert "Lin &lt;Chen&gt;，你好！" in html
        assert "欢迎参加我们的 Isar &amp; Friends 骑行活动" in html
        assert "请按下方的时间到集合点，我们不见不散。" in html
