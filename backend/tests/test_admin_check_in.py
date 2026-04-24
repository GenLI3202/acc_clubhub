"""
Tests for admin RSVP check-in.
"""
from __future__ import annotations

from models import RSVP


def _check_in(client, event_id: int, rsvp_id: int):
    """POST to RSVP check-in endpoint."""
    return client.post(
        f"/api/admin/events/{event_id}/rsvp/check-in",
        json={"rsvp_id": rsvp_id},
    )


class TestAdminRsvpCheckIn:
    def test_check_in_confirmed_rsvp_sets_attendance(
        self,
        client,
        db,
        sample_event,
        confirmed_rsvp,
    ):
        resp = _check_in(client, sample_event.id, confirmed_rsvp.id)

        assert resp.status_code == 200
        assert resp.json()["attendance_status"] == "checked_in"

        db.refresh(confirmed_rsvp)
        assert confirmed_rsvp.status == "confirmed"
        assert confirmed_rsvp.checked_in_at is not None

    def test_check_in_is_idempotent(
        self,
        client,
        db,
        sample_event,
        confirmed_rsvp,
    ):
        first = _check_in(client, sample_event.id, confirmed_rsvp.id)
        db.refresh(confirmed_rsvp)
        checked_in_at = confirmed_rsvp.checked_in_at

        second = _check_in(client, sample_event.id, confirmed_rsvp.id)

        assert first.status_code == 200
        assert second.status_code == 200
        db.refresh(confirmed_rsvp)
        assert confirmed_rsvp.checked_in_at == checked_in_at

    def test_check_in_cancelled_rsvp_returns_400(
        self,
        client,
        db,
        sample_event,
        confirmed_rsvp,
    ):
        confirmed_rsvp.status = "cancelled"
        db.commit()

        resp = _check_in(client, sample_event.id, confirmed_rsvp.id)

        assert resp.status_code == 400
        db.refresh(confirmed_rsvp)
        assert confirmed_rsvp.checked_in_at is None

    def test_check_in_wrong_event_returns_404(
        self,
        client,
        sample_event,
        confirmed_rsvp,
    ):
        resp = _check_in(client, event_id=99999, rsvp_id=confirmed_rsvp.id)

        assert resp.status_code == 404

    def test_rsvp_list_includes_attendance_status(
        self,
        client,
        db,
        sample_event,
        confirmed_rsvp,
    ):
        _check_in(client, sample_event.id, confirmed_rsvp.id)

        waitlist = RSVP(
            event_id=sample_event.id,
            email="waitlist@example.com",
            name="Waitlist",
            status="waitlist",
            privacy_accepted=True,
        )
        db.add(waitlist)
        db.commit()

        resp = client.get(f"/api/admin/events/{sample_event.id}/rsvps")

        assert resp.status_code == 200
        data = resp.json()
        by_email = {rsvp["email"]: rsvp for rsvp in data["rsvps"]}
        assert data["summary"]["checked_in"] == 1
        assert by_email[confirmed_rsvp.email]["attendance_status"] == "checked_in"
        assert by_email[confirmed_rsvp.email]["checked_in_at"] is not None
        assert by_email["waitlist@example.com"]["attendance_status"] == "registered"
