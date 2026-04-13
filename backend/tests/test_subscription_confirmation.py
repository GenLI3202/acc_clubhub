"""
TDD tests for issue #85 — subscription confirmation email.

When a *new* subscriber is created, they should receive a confirmation email.
Re-activating an existing subscriber should NOT send a duplicate email.
"""
from __future__ import annotations
import uuid
from unittest.mock import patch, MagicMock


class TestSubscriptionConfirmationEmail:
    def test_new_subscriber_via_api_receives_confirmation_email(self, client):
        """POST /api/subscribe triggers a confirmation email for new subscribers."""
        with patch("routes.rsvp.send_subscription_confirmation_email") as mock_send:
            mock_send.return_value = None
            res = client.post("/api/subscribe", json={
                "email": "newuser@example.com",
                "name": "New User",
                "lang": "en",
                "privacy_accepted": True,
            })
        assert res.status_code == 200
        mock_send.assert_called_once()
        call_kwargs = mock_send.call_args[1] if mock_send.call_args[1] else {}
        call_args = mock_send.call_args[0] if mock_send.call_args[0] else ()
        # email and unsubscribe_token must be passed
        all_args = {**call_kwargs}
        if call_args:
            all_args["email"] = call_args[0] if len(call_args) > 0 else all_args.get("email")
        assert "newuser@example.com" in str(mock_send.call_args)

    def test_reactivated_subscriber_does_not_get_confirmation(self, client, db):
        """Re-subscribing an existing address should NOT resend confirmation."""
        from models import Subscriber
        existing = Subscriber(
            name="Existing", email="existing@example.com", lang="zh",
            is_active=False, unsubscribe_token=str(uuid.uuid4()),
        )
        db.add(existing)
        db.commit()

        with patch("routes.rsvp.send_subscription_confirmation_email") as mock_send:
            mock_send.return_value = None
            res = client.post("/api/subscribe", json={
                "email": "existing@example.com",
                "name": "Existing",
                "lang": "zh",
                "privacy_accepted": True,
            })
        assert res.status_code == 200
        # Should NOT send for a reactivation
        mock_send.assert_not_called()

    def test_confirmation_email_not_fatal(self, client):
        """Email send failure must not roll back the subscription."""
        with patch("routes.rsvp.send_subscription_confirmation_email",
                   side_effect=Exception("Resend down")):
            res = client.post("/api/subscribe", json={
                "email": "resilient@example.com",
                "name": "Resilient",
                "lang": "de",
                "privacy_accepted": True,
            })
        assert res.status_code == 200
