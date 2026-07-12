from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal

from models import Event, EventRideLeaderAssignment, EventRideLeaderCredit, EventRideLeaderSnapshot, RSVP
from services.ride_leader_credits import compute_credit_snapshot, compute_group_count


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


def _make_checked_in_rsvp(db, event_id: int, email: str, name: str) -> RSVP:
    rsvp = RSVP(
        event_id=event_id,
        email=email,
        name=name,
        status="confirmed",
        privacy_accepted=True,
        view_token=f"tok-{email}",
        checked_in_at=datetime.now(timezone.utc),
    )
    db.add(rsvp)
    db.commit()
    db.refresh(rsvp)
    return rsvp


class TestRideLeaderMath:
    def test_group_count_boundaries(self):
        assert compute_group_count(0) == 0
        assert compute_group_count(1) == 1
        assert compute_group_count(6) == 1
        assert compute_group_count(7) == 2
        assert compute_group_count(12) == 2
        assert compute_group_count(13) == 3

    def test_credit_snapshot_splits_distance_across_multiple_leaders(self):
        snapshot = compute_credit_snapshot(
            distance_km=Decimal("48.50"),
            checked_in_count=7,
            leader_count=2,
        )

        assert snapshot.effective_group_count == 2
        assert snapshot.max_credited_leader_count == 4
        assert snapshot.total_credited_km == Decimal("97.00")
        assert snapshot.credit_per_leader_km == Decimal("48.50")

    def test_credit_snapshot_rounds_fractional_split(self):
        snapshot = compute_credit_snapshot(
            distance_km=Decimal("50.00"),
            checked_in_count=13,
            leader_count=4,
        )

        assert snapshot.effective_group_count == 3
        assert snapshot.total_credited_km == Decimal("150.00")
        assert snapshot.credit_per_leader_km == Decimal("37.50")


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
        for idx in range(2, 7):
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

        # checked-in count = 6 => 1 group => max 2 credited leaders total
        second_leader = _mark_leader(client, sample_event.id, riders[0].id)
        third_leader = _mark_leader(client, sample_event.id, riders[1].id)

        assert second_leader.status_code == 200
        assert third_leader.status_code == 400
        assert "cap" in third_leader.json()["detail"]

    def test_multi_leader_credit_recalculates_when_second_leader_added(self, client, db, sample_event, confirmed_rsvp):
        sample_event.distance_km = Decimal("30.00")
        db.commit()
        _check_in(client, sample_event.id, confirmed_rsvp.id)
        second_rsvp = _make_checked_in_rsvp(db, sample_event.id, "leader2@example.com", "Leader 2")
        for idx in range(3, 8):
            _make_checked_in_rsvp(db, sample_event.id, f"rider{idx}@example.com", f"Rider {idx}")

        first_resp = _mark_leader(client, sample_event.id, confirmed_rsvp.id)
        second_resp = _mark_leader(client, sample_event.id, second_rsvp.id)

        assert first_resp.status_code == 200
        assert second_resp.status_code == 200
        credits = db.query(EventRideLeaderCredit).filter_by(event_id=sample_event.id, is_active=True).all()
        assert len(credits) == 2
        assert sorted(float(c.credit_km) for c in credits) == [30.0, 30.0]
        snapshot = db.query(EventRideLeaderSnapshot).filter_by(event_id=sample_event.id).first()
        assert snapshot.effective_group_count == 2
        assert float(snapshot.total_credited_km) == 60.0
        assert float(snapshot.credit_per_leader_km) == 30.0

    def test_undo_leader_recalculates_remaining_credit(self, client, db, sample_event, confirmed_rsvp):
        sample_event.distance_km = Decimal("30.00")
        db.commit()
        _check_in(client, sample_event.id, confirmed_rsvp.id)
        second_rsvp = _make_checked_in_rsvp(db, sample_event.id, "leader2@example.com", "Leader 2")
        for idx in range(3, 8):
            _make_checked_in_rsvp(db, sample_event.id, f"rider{idx}@example.com", f"Rider {idx}")
        _mark_leader(client, sample_event.id, confirmed_rsvp.id)
        _mark_leader(client, sample_event.id, second_rsvp.id)

        undo_resp = _undo_leader(client, sample_event.id, second_rsvp.id)

        assert undo_resp.status_code == 200
        active_credits = db.query(EventRideLeaderCredit).filter_by(event_id=sample_event.id, is_active=True).all()
        assert len(active_credits) == 1
        assert float(active_credits[0].credit_km) == 60.0
        snapshot = db.query(EventRideLeaderSnapshot).filter_by(event_id=sample_event.id).first()
        assert snapshot.credited_leader_count == 1
        assert float(snapshot.credit_per_leader_km) == 60.0

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

    def test_cancel_restore_recheckin_remark_state_machine(self, client, db, sample_event, confirmed_rsvp):
        sample_event.distance_km = Decimal("42.00")
        db.commit()
        _check_in(client, sample_event.id, confirmed_rsvp.id)
        _mark_leader(client, sample_event.id, confirmed_rsvp.id)

        cancel_resp = client.post(
            f"/api/admin/events/{sample_event.id}/rsvp/cancel",
            json={"rsvp_id": confirmed_rsvp.id},
        )
        restore_resp = client.post(
            f"/api/admin/events/{sample_event.id}/rsvp/restore",
            json={"rsvp_id": confirmed_rsvp.id},
        )
        recheck_resp = _check_in(client, sample_event.id, confirmed_rsvp.id)
        remark_resp = _mark_leader(client, sample_event.id, confirmed_rsvp.id)

        assert cancel_resp.status_code == 200
        assert restore_resp.status_code == 200
        assert recheck_resp.status_code == 200
        assert remark_resp.status_code == 200
        active_credits = db.query(EventRideLeaderCredit).filter_by(event_id=sample_event.id, is_active=True).all()
        assert len(active_credits) == 1
        assert float(active_credits[0].credit_km) == 42.0


class TestRideLeaderReporting:
    def test_reporting_roster_includes_taoyue_without_credits(self, client, db):
        summary_resp = _leader_summary(client, 2025)
        detail_resp = _leader_detail(client, "Taoyue Yang", 2025)

        assert summary_resp.status_code == 200
        leaders = {
            leader["leader_name"]: leader
            for leader in summary_resp.json()["leaders"]
        }
        assert leaders["Taoyue Yang"]["lead_events_count"] == 0
        assert leaders["Taoyue Yang"]["total_credited_km"] == 0.0
        assert leaders["Taoyue Yang"]["reimbursement_eligible"] is False

        assert detail_resp.status_code == 200
        assert detail_resp.json()["leader_name"] == "Taoyue Yang"
        assert detail_resp.json()["lead_events_count"] == 0
        assert detail_resp.json()["total_credited_km"] == 0.0

    def test_manual_leader_credits_appear_in_2026_board(self, client, db):
        spring_event = Event(
            slug="2026-acc-season-opening",
            title="ACC 2026 开春咖啡骑",
            event_date=datetime(2026, 4, 18, 8, 30, tzinfo=timezone.utc),
            location="Munich",
            event_type="social-ride",
            max_participants=35,
            current_participants=0,
            distance_km=Decimal("41.60"),
        )
        db.add(spring_event)
        db.commit()
        db.refresh(spring_event)
        existing_rsvp = _make_checked_in_rsvp(
            db,
            spring_event.id,
            "existing-leader@example.com",
            "Existing Leader",
        )
        _mark_leader(client, spring_event.id, existing_rsvp.id)

        summary_resp = _leader_summary(client, 2026)
        detail_resp = _leader_detail(client, "Taoyue Yang", 2026)
        ziyang_detail_resp = _leader_detail(client, "Ziyang Zhang", 2026)
        existing_detail_resp = _leader_detail(client, "Existing Leader", 2026)

        assert summary_resp.status_code == 200
        leaders = {
            leader["leader_name"]: leader
            for leader in summary_resp.json()["leaders"]
        }
        assert leaders["Taoyue Yang"]["lead_events_count"] == 2
        assert leaders["Taoyue Yang"]["total_credited_km"] == 68.2
        assert leaders["Ziyang Zhang"]["lead_events_count"] == 1
        assert leaders["Ziyang Zhang"]["total_credited_km"] == 20.8
        assert leaders["Existing Leader"]["total_credited_km"] == 20.8

        assert detail_resp.status_code == 200
        detail = detail_resp.json()
        assert detail["leader_name"] == "Taoyue Yang"
        assert detail["lead_events_count"] == 2
        assert detail["total_credited_km"] == 68.2
        assert detail["history"] == [
            {
                "event_id": 0,
                "event_slug": "2026-acc-season-opening",
                "event_title": "ACC 2026 开春咖啡骑",
                "event_date": "2026-04-18T08:30:00+00:00",
                "distance_km": 41.6,
                "checked_in_count": 19,
                "effective_group_count": 3,
                "credited_leader_count": 6,
                "credit_km": 20.8,
            },
            {
                "event_id": 0,
                "event_slug": "afterwork-ride-munich-north-2026-07-02",
                "event_title": "ACC North Afterwork Ride",
                "event_date": "2026-07-02T16:00:00+00:00",
                "distance_km": 47.4,
                "checked_in_count": 4,
                "effective_group_count": 1,
                "credited_leader_count": 1,
                "credit_km": 47.4,
            }
        ]
        assert ziyang_detail_resp.status_code == 200
        assert ziyang_detail_resp.json()["leader_name"] == "Ziyang Zhang"
        assert ziyang_detail_resp.json()["total_credited_km"] == 20.8
        assert existing_detail_resp.status_code == 200
        existing_history = existing_detail_resp.json()["history"]
        assert existing_history[0]["checked_in_count"] == 19
        assert existing_history[0]["credited_leader_count"] == 6
        assert existing_history[0]["credit_km"] == 20.8

    def test_annual_aggregation_by_name_and_history(self, client, db, sample_event, confirmed_rsvp):
        sample_event.distance_km = Decimal("40.00")
        sample_event.event_date = datetime(2026, 4, 18, 10, 30, tzinfo=timezone.utc)
        db.commit()
        _check_in(client, sample_event.id, confirmed_rsvp.id)
        _mark_leader(client, sample_event.id, confirmed_rsvp.id)

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

    def test_same_name_aggregates_across_events_and_filters_year(self, client, db, sample_event, confirmed_rsvp):
        sample_event.distance_km = Decimal("50.00")
        sample_event.event_date = datetime(2026, 4, 18, 10, 30, tzinfo=timezone.utc)
        second_event = Event(
            slug="second-ride-2026",
            title="Second Ride 2026",
            event_date=datetime(2026, 6, 1, 9, 0, tzinfo=timezone.utc),
            location="Munich",
            event_type="social-ride",
            max_participants=12,
            current_participants=0,
            distance_km=Decimal("70.00"),
        )
        old_year_event = Event(
            slug="old-ride-2025",
            title="Old Ride 2025",
            event_date=datetime(2025, 9, 1, 9, 0, tzinfo=timezone.utc),
            location="Munich",
            event_type="social-ride",
            max_participants=12,
            current_participants=0,
            distance_km=Decimal("80.00"),
        )
        db.add_all([second_event, old_year_event])
        db.commit()
        db.refresh(second_event)
        db.refresh(old_year_event)

        _check_in(client, sample_event.id, confirmed_rsvp.id)
        _mark_leader(client, sample_event.id, confirmed_rsvp.id)

        second_rsvp = _make_checked_in_rsvp(db, second_event.id, "same-name-2@example.com", confirmed_rsvp.name)
        old_year_rsvp = _make_checked_in_rsvp(db, old_year_event.id, "same-name-3@example.com", confirmed_rsvp.name)
        _mark_leader(client, second_event.id, second_rsvp.id)
        _mark_leader(client, old_year_event.id, old_year_rsvp.id)

        summary_2026 = _leader_summary(client, 2026)
        detail_2026 = _leader_detail(client, confirmed_rsvp.name, 2026)
        summary_2025 = _leader_summary(client, 2025)

        assert summary_2026.status_code == 200
        assert detail_2026.status_code == 200
        assert summary_2025.status_code == 200

        leader_2026 = next(
            leader for leader in summary_2026.json()["leaders"]
            if leader["leader_name"] == confirmed_rsvp.name
        )
        assert leader_2026["lead_events_count"] == 2
        assert leader_2026["total_credited_km"] == 120.0

        detail = detail_2026.json()
        assert detail["lead_events_count"] == 2
        assert detail["total_credited_km"] == 120.0
        assert [point["cumulative_km"] for point in detail["progress"]] == [50.0, 120.0]
        assert len(detail["history"]) == 2

        leader_2025 = next(
            leader for leader in summary_2025.json()["leaders"]
            if leader["leader_name"] == confirmed_rsvp.name
        )
        assert leader_2025["lead_events_count"] == 1
        assert leader_2025["total_credited_km"] == 80.0

    def test_historical_aliases_merge_into_canonical_leader_names(
        self,
        client,
        db,
    ):
        aliases = [
            ("Gen", "Gen Li", Decimal("20.00")),
            ("GenL", "Gen Li", Decimal("30.00")),
            ("Konfuzius", "Sheng Yuan", Decimal("40.00")),
            ("Shane Shen", "Zhikuan Shen", Decimal("50.00")),
            ("Yang Taoyue", "Taoyue Yang", Decimal("60.00")),
            ("Zhang Ziyang", "Ziyang Zhang", Decimal("70.00")),
        ]
        for index, (alias, _canonical_name, distance) in enumerate(
            aliases,
            start=1,
        ):
            event = Event(
                slug=f"alias-ride-{index}",
                title=f"Alias Ride {index}",
                event_date=datetime(2026, 5, index, 9, 0, tzinfo=timezone.utc),
                location="Munich",
                event_type="social-ride",
                max_participants=12,
                current_participants=0,
                distance_km=distance,
            )
            db.add(event)
            db.commit()
            db.refresh(event)
            rsvp = _make_checked_in_rsvp(
                db,
                event.id,
                f"alias-{index}@example.com",
                alias,
            )
            _mark_leader(client, event.id, rsvp.id)

        summary_resp = _leader_summary(client, 2026)
        gen_detail_resp = _leader_detail(client, "Gen Li", 2026)
        gen_alias_detail_resp = _leader_detail(client, "Gen", 2026)
        konfuzius_detail_resp = _leader_detail(client, "Konfuzius", 2026)
        shane_detail_resp = _leader_detail(client, "Shane Shen", 2026)
        taoyue_detail_resp = _leader_detail(client, "Yang Taoyue", 2026)
        ziyang_detail_resp = _leader_detail(client, "Zhang Ziyang", 2026)

        assert summary_resp.status_code == 200
        leaders = {
            leader["leader_name"]: leader
            for leader in summary_resp.json()["leaders"]
        }
        assert "Gen" not in leaders
        assert "GenL" not in leaders
        assert leaders["Gen Li"]["lead_events_count"] == 2
        assert leaders["Gen Li"]["total_credited_km"] == 50.0
        assert leaders["Sheng Yuan"]["total_credited_km"] == 40.0
        assert leaders["Zhikuan Shen"]["total_credited_km"] == 50.0
        assert leaders["Taoyue Yang"]["lead_events_count"] == 3
        assert leaders["Taoyue Yang"]["total_credited_km"] == 128.2
        assert leaders["Ziyang Zhang"]["lead_events_count"] == 2
        assert leaders["Ziyang Zhang"]["total_credited_km"] == 90.8

        assert gen_detail_resp.status_code == 200
        assert gen_alias_detail_resp.status_code == 200
        assert konfuzius_detail_resp.status_code == 200
        assert shane_detail_resp.status_code == 200
        assert taoyue_detail_resp.status_code == 200
        assert ziyang_detail_resp.status_code == 200
        assert gen_detail_resp.json()["leader_name"] == "Gen Li"
        assert gen_detail_resp.json()["lead_events_count"] == 2
        assert gen_alias_detail_resp.json()["leader_name"] == "Gen Li"
        assert gen_alias_detail_resp.json()["lead_events_count"] == 2
        assert konfuzius_detail_resp.json()["leader_name"] == "Sheng Yuan"
        assert shane_detail_resp.json()["leader_name"] == "Zhikuan Shen"
        assert taoyue_detail_resp.json()["leader_name"] == "Taoyue Yang"
        assert taoyue_detail_resp.json()["lead_events_count"] == 3
        assert ziyang_detail_resp.json()["leader_name"] == "Ziyang Zhang"

    def test_reimbursement_and_subsidy_thresholds_are_reported(self, client, db, sample_event, confirmed_rsvp):
        sample_event.distance_km = Decimal("320.00")
        sample_event.event_date = datetime(2026, 5, 1, 9, 0, tzinfo=timezone.utc)
        extra_event = Event(
            slug="bonus-ride-2026",
            title="Bonus Ride 2026",
            event_date=datetime(2026, 7, 1, 9, 0, tzinfo=timezone.utc),
            location="Munich",
            event_type="social-ride",
            max_participants=12,
            current_participants=0,
            distance_km=Decimal("40.00"),
        )
        db.add(extra_event)
        db.commit()
        db.refresh(extra_event)

        _check_in(client, sample_event.id, confirmed_rsvp.id)
        _mark_leader(client, sample_event.id, confirmed_rsvp.id)
        extra_rsvp = _make_checked_in_rsvp(db, extra_event.id, "bonus@example.com", confirmed_rsvp.name)
        _mark_leader(client, extra_event.id, extra_rsvp.id)

        detail_resp = _leader_detail(client, confirmed_rsvp.name, 2026)
        assert detail_resp.status_code == 200
        detail = detail_resp.json()
        assert detail["total_credited_km"] == 360.0
        assert detail["reimbursement_eligible"] is True
        assert detail["excess_km"] == 40.0
        assert detail["estimated_subsidy_eur"] == 2.0
