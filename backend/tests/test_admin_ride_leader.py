from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal

from models import EventRideLeaderAssignment, EventRideLeaderCredit, EventRideLeaderSnapshot, RSVP


def _check_in(client, event_id: int, rsvp_id: int):
    return client.post(
        f"/api/admin/events/{event_id}/rsvp/check-in",
        json={"rsvp_id": rsvp_id},
    )


def _mark_leader(client, event_id: int, rsvp_id: int):
    return client.post(
        f"/api/admin/events/{event_id}/rsvp/ride-leader",
        json={"rsvp_id": rsvp_id},
    )


def _undo_leader(client, event_id: int, rsvp_id: int):
    return client.post(
        f"/api/admin/events/{event_id}/rsvp/ride-leader/undo",
        json={"rsvp_id": rsvp_id},
    )


def _leader_summary(client, year: int):
    return client.get(f"/api/admin/ride-leaders?year={year}")


def _leader_detail(client, leader_name: str, year: int):
    return client.get(f"/api/admin/ride-leaders/{leader_name}?year={year}")


class TestRideLeaderWorkflow:
    def test_checked_in_confirmed_rsvp_can_be_marked_leader(self, client, db, sample_event, confirmed_rsvp):
        sample_event.distance_km = Decimal("48.50")
        db.commit()

        _check_in(client, sample_event.id, confirmed_rsvp.id)
        resp = _mark_leader(client, sample_event.id, confirmed_rsvp.id)

        assert resp.status_code == 200
        db.refresh(confirmed_rsvp)
        assignment = db.query(EventRideLeaderAssignment).filter_by(
            event_id=sample_event.id,
            rsvp_id=confirmed_rsvp.id,
        ).first()
        credit = db.query(EventRideLeaderCredit).filter_by(
            event_id=sample_event.id,
            rsvp_id=confirmed_rsvp.id,
        ).first()
        snapshot = db.query(EventRideLeaderSnapshot).filter_by(event_id=sample_event.id).first()

        assert assignment is not None and assignment.is_active is True
        assert credit is not None and credit.is_active is True
        assert float(credit.credit_km) == 48.5
        assert snapshot is not None
        assert snapshot.checked_in_count == 1
        assert snapshot.effective_group_count == 1
        assert snapshot.credited_leader_count == 1

    def test_unchecked_in_rsvp_cannot_be_marked_leader(self, client, db, sample_event, confirmed_rsvp):
        sample_event.distance_km = Decimal("48.50")
        db.commit()

        resp = _mark_leader(client, sample_event.id, confirmed_rsvp.id)

        assert resp.status_code == 400
        assert "checked-in confirmed" in resp.json()["detail"]

    def test_waitlist_rsvp_cannot_be_marked_leader(self, client, db, sample_event, waitlisted_rsvp):
        sample_event.distance_km = Decimal("48.50")
        waitlisted_rsvp.checked_in_at = datetime.now(timezone.utc)
        db.commit()

        resp = _mark_leader(client, sample_event.id, waitlisted_rsvp.id)

        assert resp.status_code == 400

    def test_mark_leader_requires_distance(self, client, db, sample_event, confirmed_rsvp):
        _check_in(client, sample_event.id, confirmed_rsvp.id)

        resp = _mark_leader(client, sample_event.id, confirmed_rsvp.id)

        assert resp.status_code == 400
        assert "distance_km" in resp.json()["detail"]

    def test_mark_leader_is_idempotent(self, client, db, sample_event, confirmed_rsvp):
        sample_event.distance_km = Decimal("48.50")
        db.commit()
        _check_in(client, sample_event.id, confirmed_rsvp.id)

        first = _mark_leader(client, sample_event.id, confirmed_rsvp.id)
        second = _mark_leader(client, sample_event.id, confirmed_rsvp.id)

        assert first.status_code == 200
        assert second.status_code == 200
        assert db.query(EventRideLeaderAssignment).count() == 1
        assert db.query(EventRideLeaderCredit).count() == 1

    def test_undo_leader_is_idempotent(self, client, db, sample_event, confirmed_rsvp):
        sample_event.distance_km = Decimal("48.50")
        db.commit()
        _check_in(client, sample_event.id, confirmed_rsvp.id)
        _mark_leader(client, sample_event.id, confirmed_rsvp.id)

        first = _undo_leader(client, sample_event.id, confirmed_rsvp.id)
        second = _undo_leader(client, sample_event.id, confirmed_rsvp.id)

        assert first.status_code == 200
        assert second.status_code == 200
        assignment = db.query(EventRideLeaderAssignment).first()
        assert assignment is not None
        assert assignment.is_active is False

    def test_cap_enforcement_works(self, client, db, sample_event, confirmed_rsvp):
        sample_event.distance_km = Decimal("60.00")
        sample_event.max_participants = 12
        db.commit()
        _check_in(client, sample_event.id, confirmed_rsvp.id)
        _mark_leader(client, sample_event.id, confirmed_rsvp.id)

        riders = []
        for idx in range(2, 5):
            rsvp = RSVP(
                event_id=sample_event.id,
                email=f"leader{idx}@example.com",
                name=f"Leader {idx}",
                status="confirmed",
                privacy_accepted=True,
                view_token=f"tok-{idx}",
                checked_in_at=datetime.now(timezone.utc),
            )
            db.add(rsvp)
            riders.append(rsvp)
        db.commit()

        for rider in riders[:3]:
            resp = _mark_leader(client, sample_event.id, rider.id)
            if rider is riders[2]:
                assert resp.status_code == 400
                assert "cap" in resp.json()["detail"]
            else:
                assert resp.status_code == 200

    def test_undo_check_in_auto_revokes_leader(self, client, db, sample_event, confirmed_rsvp):
        sample_event.distance_km = Decimal("48.50")
        db.commit()
        _check_in(client, sample_event.id, confirmed_rsvp.id)
        _mark_leader(client, sample_event.id, confirmed_rsvp.id)

        undo_resp = client.post(
            f"/api/admin/events/{sample_event.id}/rsvp/check-in/undo",
            json={"rsvp_id": confirmed_rsvp.id},
        )

        assert undo_resp.status_code == 200
        assignment = db.query(EventRideLeaderAssignment).first()
        credit = db.query(EventRideLeaderCredit).first()
        assert assignment.is_active is False
        assert credit.is_active is False

    def test_cancel_auto_revokes_leader(self, client, db, sample_event, confirmed_rsvp):
        sample_event.distance_km = Decimal("48.50")
        db.commit()
        _check_in(client, sample_event.id, confirmed_rsvp.id)
        _mark_leader(client, sample_event.id, confirmed_rsvp.id)

        cancel_resp = client.post(
            f"/api/admin/events/{sample_event.id}/rsvp/cancel",
            json={"rsvp_id": confirmed_rsvp.id},
        )

        assert cancel_resp.status_code == 200
        assignment = db.query(EventRideLeaderAssignment).first()
        credit = db.query(EventRideLeaderCredit).first()
        assert assignment.is_active is False
        assert credit.is_active is False

    def test_restore_does_not_auto_recreate_leader_credit(self, client, db, sample_event, confirmed_rsvp):
        sample_event.distance_km = Decimal("48.50")
        db.commit()
        _check_in(client, sample_event.id, confirmed_rsvp.id)
        _mark_leader(client, sample_event.id, confirmed_rsvp.id)
        client.post(f"/api/admin/events/{sample_event.id}/rsvp/cancel", json={"rsvp_id": confirmed_rsvp.id})

        restore_resp = client.post(
            f"/api/admin/events/{sample_event.id}/rsvp/restore",
            json={"rsvp_id": confirmed_rsvp.id},
        )
        list_resp = client.get(f"/api/admin/events/{sample_event.id}/rsvps")

        assert restore_resp.status_code == 200
        assert list_resp.status_code == 200
        restored = next(row for row in list_resp.json()["rsvps"] if row["id"] == confirmed_rsvp.id)
        assert restored["is_ride_leader"] is False
        assert restored["ride_leader_credit_km"] is None


class TestRideLeaderReporting:
    def test_annual_aggregation_by_name_and_history(self, client, db, sample_event, confirmed_rsvp):
        sample_event.distance_km = Decimal("40.00")
        sample_event.event_date = datetime(2026, 4, 18, 10, 30, tzinfo=timezone.utc)
        db.commit()
        _check_in(client, sample_event.id, confirmed_rsvp.id)
        _mark_leader(client, sample_event.id, confirmed_rsvp.id)

        second_event = RSVP(
            event_id=sample_event.id,
            email="duplicate@example.com",
            name=confirmed_rsvp.name,
            status="confirmed",
            privacy_accepted=True,
            view_token="tok-dup",
            checked_in_at=datetime.now(timezone.utc),
        )
        second_host = sample_event
        db.add(second_event)
        db.commit()

        summary_resp = _leader_summary(client, 2026)
        detail_resp = _leader_detail(client, confirmed_rsvp.name, 2026)

        assert summary_resp.status_code == 200
        assert detail_resp.status_code == 200
        leaders = summary_resp.json()["leaders"]
        assert any(leader["leader_name"] == confirmed_rsvp.name for leader in leaders)
        detail = detail_resp.json()
        assert detail["leader_name"] == confirmed_rsvp.name
        assert detail["lead_events_count"] >= 1
        assert len(detail["history"]) >= 1
        assert len(detail["progress"]) >= 1
