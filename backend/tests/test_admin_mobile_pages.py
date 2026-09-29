from models import RSVP


def test_list_events_page_bounded(
    client,
    sample_event,
):
    response = client.get("/api/admin/events/page?offset=0&limit=1")
    assert response.status_code == 200
    assert response.json()["total"] == 1
    assert len(response.json()["events"]) == 1
    assert response.json()["events"][0]["id"] == sample_event.id
    assert client.get("/api/admin/events/page?limit=101").status_code == 422


def test_get_event_rsvps_page_bounded(
    client,
    db,
    sample_event,
):
    for index in range(3):
        db.add(
            RSVP(
                event_id=sample_event.id,
                email=f"rider{index}@example.test",
                name=f"Rider {index}",
                status="confirmed",
                privacy_accepted=True,
            ),
        )
    db.commit()

    path = f"/api/admin/events/{sample_event.id}/rsvps/page"
    first = client.get(f"{path}?offset=0&limit=2")
    second = client.get(f"{path}?offset=2&limit=2")
    assert first.status_code == second.status_code == 200
    assert first.json()["total"] == second.json()["total"] == 3
    assert len(first.json()["rsvps"]) == 2
    assert len(second.json()["rsvps"]) == 1
    assert "email" in first.json()["rsvps"][0]
    assert "view_token" not in first.json()["rsvps"][0]
    assert client.get(f"{path}?offset=-1").status_code == 422


def test_admin_mobile_pages_require_auth(client_no_auth):
    assert client_no_auth.get("/api/admin/events/page").status_code == 401
    assert (
        client_no_auth.get("/api/admin/events/1/rsvps/page").status_code == 401
    )
