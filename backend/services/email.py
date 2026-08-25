"""
ACC ClubHub Backend - Email Notification Service  
Phase 4.3.3: Resend integration for event confirmations
"""

import logging
from datetime import datetime
from html import escape
from typing import Optional

import resend
from config import settings
from services.event_cancellation import get_cancellation_reason_label

logger = logging.getLogger(__name__)

_CONTACT = {
    "zh": '<p style="color:#666;font-size:0.9em;">如有任何疑问，欢迎发邮件至 <a href="mailto:letusride@across-cc.de">letusride@across-cc.de</a> 联系俱乐部。</p>',
    "en": '<p style="color:#666;font-size:0.9em;">If you have any questions, feel free to contact us at <a href="mailto:letusride@across-cc.de">letusride@across-cc.de</a>.</p>',
    "de": '<p style="color:#666;font-size:0.9em;">Bei Fragen erreichst du uns jederzeit unter <a href="mailto:letusride@across-cc.de">letusride@across-cc.de</a>.</p>',
}

# Initialize Resend
if settings.RESEND_API_KEY:
    resend.api_key = settings.RESEND_API_KEY


def send_confirmation_email(
    user_email: str,
    user_name: str,
    event_title: str,
    event_date: datetime,
    event_location: Optional[str] = None,
    event_id: int = 0,
    lang: str = "zh",
    event_slug: str = "",
    view_token: str = "",
    wechat_qr_code: Optional[str] = None,
    route_komoot_url: Optional[str] = None,
) -> dict:
    """Send RSVP confirmation email"""
    if not settings.RESEND_API_KEY:
        logger.debug("Skipping email (no RESEND_API_KEY): %s", user_email)
        return {"status": "skipped", "reason": "no_api_key"}

    date_str = event_date.strftime("%Y-%m-%d %H:%M")
    frontend_url = settings.PUBLIC_FRONTEND_URL or "https://www.across-cc.de"
    participant_link = (
        f"{frontend_url}/{lang}/events/{event_slug}?token={view_token}"
        if event_slug and view_token
        else ""
    )
    qr_url = (
        wechat_qr_code if wechat_qr_code and wechat_qr_code.startswith("http")
        else f"{frontend_url}{wechat_qr_code}"
        if wechat_qr_code else ""
    )
    qr_html = (
        f'<p style="margin-top:1.2em;"><strong>微信群二维码</strong><br>'
        f'<img src="{qr_url}" alt="WeChat QR Code" '
        f'style="width:180px;height:180px;margin-top:8px;border:1px solid #eee;border-radius:4px;" /></p>'
        if qr_url else ""
    )
    route_labels = {
        "zh": "查看 Komoot 路线",
        "en": "View route on Komoot",
        "de": "Route auf Komoot ansehen",
    }
    route_html = (
        '<p style="margin-top:1.2em;">'
        f'<a href="{escape(route_komoot_url, quote=True)}">'
        f'{route_labels.get(lang, route_labels["en"])}</a></p>'
        if route_komoot_url else ""
    )

    templates = {
        "zh": {
            "subject": f"报名确认: {event_title}",
            "body": f"""<p>您好 {user_name}，</p>
<p>您已成功报名参加以下活动：</p>
<ul>
    <li><strong>活动：</strong>{event_title}</li>
    <li><strong>时间：</strong>{date_str}</li>
    <li><strong>地点：</strong>{event_location or "待定"}</li>
</ul>
{route_html}
{f'<p><a href="{participant_link}">查看参与名单</a></p>' if participant_link else ""}
{qr_html}
<p>祝您骑行愉快！</p>
<p>—— ACC ClubHub 团队</p>""",
        },
        "en": {
            "subject": f"Registration Confirmed: {event_title}",
            "body": f"""<p>Hello {user_name},</p>
<p>You have successfully registered for:</p>
<ul>
    <li><strong>Event:</strong> {event_title}</li>
    <li><strong>Date:</strong> {date_str}</li>
    <li><strong>Location:</strong> {event_location or "TBD"}</li>
</ul>
{route_html}
{f'<p><a href="{participant_link}">View participant list</a></p>' if participant_link else ""}
{qr_html}
<p>Enjoy your ride!</p>
<p>—— ACC ClubHub Team</p>""",
        },
        "de": {
            "subject": f"Anmeldung bestätigt: {event_title}",
            "body": f"""<p>Hallo {user_name},</p>
<p>Sie haben sich erfolgreich angemeldet für:</p>
<ul>
    <li><strong>Veranstaltung:</strong> {event_title}</li>
    <li><strong>Datum:</strong> {date_str}</li>
    <li><strong>Ort:</strong> {event_location or "TBD"}</li>
</ul>
{route_html}
{f'<p><a href="{participant_link}">Teilnehmerliste ansehen</a></p>' if participant_link else ""}
{qr_html}
<p>Viel Spaß beim Radfahren!</p>
<p>—— ACC ClubHub Team</p>""",
        },
    }

    template = templates.get(lang, templates["zh"])
    html_body = f"""<div style="font-family: Arial, sans-serif; max-width: 600px;">
<h2 style="color: #2A5CA6;">🚴 {template["subject"]}</h2>
{template["body"]}
{_CONTACT.get(lang, _CONTACT["en"])}
</div>"""

    params = {
        "from": "ACC ClubHub <noreply@events.across-cc.de>",
        "to": [user_email],
        "subject": template["subject"],
        "html": html_body,
    }

    try:
        return resend.Emails.send(params)
    except Exception as e:
        logger.error("Failed to send email: %s", e, exc_info=True)
        return {"status": "error", "message": str(e)}


def send_cancellation_email(
    user_email: str,
    user_name: str,
    event_title: str,
    event_date: Optional[datetime] = None,
    event_location: Optional[str] = None,
    lang: str = "zh",
) -> dict:
    """Send cancellation notification email when admin cancels an RSVP."""
    if not settings.RESEND_API_KEY:
        logger.debug("Skipping cancellation email (no RESEND_API_KEY): %s", user_email)
        return {"status": "skipped", "reason": "no_api_key"}

    date_str = event_date.strftime("%Y-%m-%d %H:%M") if event_date else ""

    templates = {
        "zh": {
            "subject": f"报名已取消: {event_title}",
            "body": (
                f"<p>您好 {user_name}，</p>"
                f"<p>您在以下活动中的报名已由管理员取消：</p>"
                f"<ul><li><strong>活动：</strong>{event_title}</li>"
                + (f"<li><strong>时间：</strong>{date_str}</li>" if date_str else "")
                + (f"<li><strong>地点：</strong>{event_location}</li>" if event_location else "")
                + "</ul>"
                f"<p>如有疑问，请联系 ACC 团队。</p>"
                f"<p>—— ACC ClubHub 团队</p>"
            ),
        },
        "en": {
            "subject": f"Registration Cancelled: {event_title}",
            "body": (
                f"<p>Hello {user_name},</p>"
                f"<p>Your registration for the following event has been cancelled by an admin:</p>"
                f"<ul><li><strong>Event:</strong> {event_title}</li>"
                + (f"<li><strong>Date:</strong> {date_str}</li>" if date_str else "")
                + (f"<li><strong>Location:</strong> {event_location}</li>" if event_location else "")
                + "</ul>"
                f"<p>If you have questions, please contact the ACC team.</p>"
                f"<p>—— ACC ClubHub Team</p>"
            ),
        },
        "de": {
            "subject": f"Anmeldung storniert: {event_title}",
            "body": (
                f"<p>Hallo {user_name},</p>"
                f"<p>Ihre Anmeldung für folgende Veranstaltung wurde von einem Admin storniert:</p>"
                f"<ul><li><strong>Veranstaltung:</strong> {event_title}</li>"
                + (f"<li><strong>Datum:</strong> {date_str}</li>" if date_str else "")
                + (f"<li><strong>Ort:</strong> {event_location}</li>" if event_location else "")
                + "</ul>"
                f"<p>Bei Fragen wenden Sie sich bitte an das ACC-Team.</p>"
                f"<p>—— ACC ClubHub Team</p>"
            ),
        },
    }

    template = templates.get(lang, templates["en"])
    html_body = (
        f'<div style="font-family: Arial, sans-serif; max-width: 600px;">'
        f'<h2 style="color: #C62828;">❌ {template["subject"]}</h2>'
        f"{template['body']}"
        f"{_CONTACT.get(lang, _CONTACT['en'])}"
        f"</div>"
    )

    params = {
        "from": "ACC ClubHub <noreply@events.across-cc.de>",
        "to": [user_email],
        "subject": template["subject"],
        "html": html_body,
    }

    try:
        return resend.Emails.send(params)
    except Exception as e:
        logger.error("Failed to send cancellation email: %s", e, exc_info=True)
        return {"status": "error", "message": str(e)}


def send_event_cancellation_email(
    user_email: str,
    user_name: str,
    event_title: str,
    event_date: Optional[datetime] = None,
    event_location: Optional[str] = None,
    cancellation_reason: str = "other",
    event_slug: str = "",
) -> dict:
    """Send an event-wide cancellation notice to a registered rider.

    Args:
        user_email: Recipient email address.
        user_name: Recipient display name.
        event_title: Cancelled event title.
        event_date: Scheduled event date and time.
        event_location: Scheduled meeting location.
        cancellation_reason: Valid event cancellation reason code.
        event_slug: Public event page slug.

    Returns:
        Resend response or a local skipped/error status dictionary.
    """
    if not settings.RESEND_API_KEY:
        logger.debug(
            "Skipping event cancellation email (no RESEND_API_KEY): %s",
            user_email,
        )
        return {"status": "skipped", "reason": "no_api_key"}

    safe_name = escape(user_name)
    safe_title = escape(event_title)
    safe_location = escape(event_location or "")
    safe_reason = escape(
        get_cancellation_reason_label(cancellation_reason),
    )
    date_str = event_date.strftime("%Y-%m-%d %H:%M") if event_date else ""
    frontend_url = settings.PUBLIC_FRONTEND_URL or "https://www.across-cc.de"
    event_link = (
        f"{frontend_url}/en/events/{escape(event_slug, quote=True)}"
        if event_slug
        else frontend_url
    )

    html_body = (
        '<div style="font-family:Arial,sans-serif;max-width:600px;">'
        f'<h2 style="color:#C62828;">Event Cancelled: {safe_title}</h2>'
        f"<p>Hello {safe_name},</p>"
        "<p>The following event has been cancelled:</p>"
        "<ul>"
        f"<li><strong>Event:</strong> {safe_title}</li>"
        + (f"<li><strong>Date:</strong> {date_str}</li>" if date_str else "")
        + (
            f"<li><strong>Location:</strong> {safe_location}</li>"
            if safe_location
            else ""
        )
        + f"<li><strong>Reason:</strong> {safe_reason}</li>"
        + "</ul>"
        + f'<p><a href="{event_link}">View event details</a></p>'
        + "<p>— ACC ClubHub Team</p>"
        + _CONTACT["en"]
        + "</div>"
    )

    params = {
        "from": "ACC ClubHub <noreply@events.across-cc.de>",
        "to": [user_email],
        "subject": f"Event Cancelled: {event_title}",
        "html": html_body,
    }

    try:
        return resend.Emails.send(params)
    except Exception as error:
        logger.error(
            "Failed to send event cancellation email to %s: %s",
            user_email,
            error,
            exc_info=True,
        )
        return {"status": "error", "message": str(error)}


def send_broadcast_email(
    user_email: str,
    user_name: str,
    event_title: str,
    event_date: Optional[datetime] = None,
    event_location: Optional[str] = None,
    event_slug: str = "",
    lang: str = "zh",
    unsubscribe_token: str = "",
) -> dict:
    """Send event announcement broadcast email to a subscriber."""
    if not settings.RESEND_API_KEY:
        logger.debug("Skipping broadcast email (no RESEND_API_KEY): %s", user_email)
        return {"status": "skipped", "reason": "no_api_key"}

    date_str = event_date.strftime("%Y-%m-%d %H:%M") if event_date else ""
    frontend_url = settings.PUBLIC_FRONTEND_URL or "https://www.across-cc.de"
    event_link = f"{frontend_url}/{lang}/events/{event_slug}" if event_slug else frontend_url
    unsub_link = (
        f"{frontend_url}/api/unsubscribe/{unsubscribe_token}"
        if unsubscribe_token else ""
    )
    unsub_html = (
        f'<p style="font-size:0.8em;color:#999;">不再接收活动通知？<a href="{unsub_link}">点击退订</a></p>'
        if lang == "zh" and unsub_link
        else f'<p style="font-size:0.8em;color:#999;"><a href="{unsub_link}">Unsubscribe</a></p>'
        if unsub_link else ""
    )

    templates = {
        "zh": {
            "subject": f"新活动通知: {event_title}",
            "body": (
                f"<p>您好 {user_name}，</p>"
                f"<p>ACC ClubHub 有新活动发布：</p>"
                f"<ul>"
                f"<li><strong>活动：</strong>{event_title}</li>"
                + (f"<li><strong>时间：</strong>{date_str}</li>" if date_str else "")
                + (f"<li><strong>地点：</strong>{event_location}</li>" if event_location else "")
                + f"</ul>"
                f'<p><a href="{event_link}" style="background:#C62828;color:white;padding:8px 16px;'
                f'border-radius:4px;text-decoration:none;font-weight:600;">立即查看 →</a></p>'
                f"{unsub_html}"
            ),
        },
        "en": {
            "subject": f"New Event: {event_title}",
            "body": (
                f"<p>Hello {user_name},</p>"
                f"<p>A new event has been published on ACC ClubHub:</p>"
                f"<ul>"
                f"<li><strong>Event:</strong> {event_title}</li>"
                + (f"<li><strong>Date:</strong> {date_str}</li>" if date_str else "")
                + (f"<li><strong>Location:</strong> {event_location}</li>" if event_location else "")
                + f"</ul>"
                f'<p><a href="{event_link}" style="background:#C62828;color:white;padding:8px 16px;'
                f'border-radius:4px;text-decoration:none;font-weight:600;">View Event →</a></p>'
                f"{unsub_html}"
            ),
        },
        "de": {
            "subject": f"Neue Veranstaltung: {event_title}",
            "body": (
                f"<p>Hallo {user_name},</p>"
                f"<p>Eine neue Veranstaltung wurde auf ACC ClubHub veröffentlicht:</p>"
                f"<ul>"
                f"<li><strong>Veranstaltung:</strong> {event_title}</li>"
                + (f"<li><strong>Datum:</strong> {date_str}</li>" if date_str else "")
                + (f"<li><strong>Ort:</strong> {event_location}</li>" if event_location else "")
                + f"</ul>"
                f'<p><a href="{event_link}" style="background:#C62828;color:white;padding:8px 16px;'
                f'border-radius:4px;text-decoration:none;font-weight:600;">Veranstaltung ansehen →</a></p>'
                f"{unsub_html}"
            ),
        },
    }

    template = templates.get(lang, templates["en"])
    html_body = (
        f'<div style="font-family:Arial,sans-serif;max-width:600px;">'
        f'<h2 style="color:#C62828;">🚴 {template["subject"]}</h2>'
        f"{template['body']}"
        f"{_CONTACT.get(lang, _CONTACT['en'])}"
        f"</div>"
    )

    params = {
        "from": "ACC ClubHub <noreply@events.across-cc.de>",
        "to": [user_email],
        "subject": template["subject"],
        "html": html_body,
    }

    try:
        return resend.Emails.send(params)
    except Exception as e:
        logger.error("Failed to send broadcast email to %s: %s", user_email, e, exc_info=True)
        return {"status": "error", "message": str(e)}


def send_registrant_notification_email(
    user_email: str,
    user_name: str,
    event_title: str,
    event_date: Optional[datetime] = None,
    event_location: Optional[str] = None,
    event_slug: str = "",
    view_token: str = "",
    lang: str = "en",
) -> dict:
    """Send an event update/reminder notification to an event registrant."""
    if not settings.RESEND_API_KEY:
        logger.debug("Skipping registrant notification (no RESEND_API_KEY): %s", user_email)
        return {"status": "skipped", "reason": "no_api_key"}

    date_str = event_date.strftime("%Y-%m-%d %H:%M") if event_date else ""
    frontend_url = settings.PUBLIC_FRONTEND_URL or "https://www.across-cc.de"
    event_link = (
        f"{frontend_url}/{lang}/events/{event_slug}?token={view_token}"
        if event_slug and view_token
        else f"{frontend_url}/{lang}/events/{event_slug}"
        if event_slug
        else frontend_url
    )

    templates = {
        "zh": {
            "subject": f"活动提醒: {event_title}",
            "body": (
                f"<p>您好 {user_name}，</p>"
                f"<p>以下是您已报名活动的最新信息：</p>"
                f"<ul>"
                f"<li><strong>活动：</strong>{event_title}</li>"
                + (f"<li><strong>时间：</strong>{date_str}</li>" if date_str else "")
                + (f"<li><strong>地点：</strong>{event_location}</li>" if event_location else "")
                + f"</ul>"
                f'<p><a href="{event_link}" style="background:#2A5CA6;color:white;padding:8px 16px;'
                f'border-radius:4px;text-decoration:none;font-weight:600;">查看活动详情 →</a></p>'
                f"<p>—— ACC ClubHub 团队</p>"
            ),
        },
        "en": {
            "subject": f"Event Reminder: {event_title}",
            "body": (
                f"<p>Hello {user_name},</p>"
                f"<p>Here is an update about the event you registered for:</p>"
                f"<ul>"
                f"<li><strong>Event:</strong> {event_title}</li>"
                + (f"<li><strong>Date:</strong> {date_str}</li>" if date_str else "")
                + (f"<li><strong>Location:</strong> {event_location}</li>" if event_location else "")
                + f"</ul>"
                f'<p><a href="{event_link}" style="background:#2A5CA6;color:white;padding:8px 16px;'
                f'border-radius:4px;text-decoration:none;font-weight:600;">View Event →</a></p>'
                f"<p>—— ACC ClubHub Team</p>"
            ),
        },
        "de": {
            "subject": f"Veranstaltungserinnerung: {event_title}",
            "body": (
                f"<p>Hallo {user_name},</p>"
                f"<p>Hier ist eine Aktualisierung zur Veranstaltung, für die Sie sich angemeldet haben:</p>"
                f"<ul>"
                f"<li><strong>Veranstaltung:</strong> {event_title}</li>"
                + (f"<li><strong>Datum:</strong> {date_str}</li>" if date_str else "")
                + (f"<li><strong>Ort:</strong> {event_location}</li>" if event_location else "")
                + f"</ul>"
                f'<p><a href="{event_link}" style="background:#2A5CA6;color:white;padding:8px 16px;'
                f'border-radius:4px;text-decoration:none;font-weight:600;">Veranstaltung ansehen →</a></p>'
                f"<p>—— ACC ClubHub Team</p>"
            ),
        },
    }

    template = templates.get(lang, templates["en"])
    html_body = (
        f'<div style="font-family:Arial,sans-serif;max-width:600px;">'
        f'<h2 style="color:#2A5CA6;">🚴 {template["subject"]}</h2>'
        f"{template['body']}"
        f"{_CONTACT.get(lang, _CONTACT['en'])}"
        f"</div>"
    )

    params = {
        "from": "ACC ClubHub <noreply@events.across-cc.de>",
        "to": [user_email],
        "subject": template["subject"],
        "html": html_body,
    }

    try:
        return resend.Emails.send(params)
    except Exception as e:
        logger.error(
            "Failed to send registrant notification to %s: %s", user_email, e, exc_info=True,
        )
        return {"status": "error", "message": str(e)}


def send_waitlist_email(
    user_email: str,
    user_name: str,
    event_title: str,
    waitlist_position: int,
    lang: str = "zh",
    event_slug: str = "",
    view_token: str = "",
) -> dict:
    """Send waitlist notification email"""
    if not settings.RESEND_API_KEY:
        return {"status": "skipped"}

    frontend_url = settings.PUBLIC_FRONTEND_URL or "https://www.across-cc.de"
    participant_link = (
        f"{frontend_url}/{lang}/events/{event_slug}?token={view_token}"
        if event_slug and view_token
        else ""
    )

    templates = {
        "zh": {"subject": f"已加入等待名单: {event_title}"},
        "en": {"subject": f"Joined Waitlist: {event_title}"},
    }

    template = templates.get(lang, templates["zh"])
    link_html = (
        f'<p><a href="{participant_link}">View event info</a></p>'
        if participant_link else ""
    )
    body_templates = {
        "zh": (
            f"<p>\u60a8\u597d {user_name}\uff0c\u60a8\u5728 {event_title} "
            f"\u7684\u7b49\u5f85\u540d\u5355\u4e2d\u6392\u7b2c {waitlist_position} "
            f"\u4f4d\u3002</p>{link_html}"
        ),
        "en": (
            f"<p>Hello {user_name}, you are #{waitlist_position} on the waitlist "
            f"for {event_title}.</p>{link_html}"
        ),
        "de": (
            f"<p>Hallo {user_name}, Sie sind Nr. {waitlist_position} auf der "
            f"Warteliste f\u00fcr {event_title}.</p>{link_html}"
        ),
    }
    html_body = body_templates.get(lang, body_templates["en"]) + _CONTACT.get(lang, _CONTACT["en"])

    params = {
        "from": "ACC ClubHub <noreply@events.across-cc.de>",
        "to": [user_email],
        "subject": template["subject"],
        "html": html_body,
    }

    try:
        return resend.Emails.send(params)
    except Exception as e:
        return {"status": "error", "message": str(e)}


def send_ride_leader_registration_alert(
    leader_email: str,
    leader_name: str,
    participant_name: str,
    registration_status: str,
    event_title: str,
    event_date: datetime,
    event_id: int,
    confirmed_count: int,
    max_participants: Optional[int],
) -> dict:
    """Send a ride leader an operational alert for a new RSVP.

    Args:
        leader_email: Alert recipient address.
        leader_name: Alert recipient display name.
        participant_name: New participant display name.
        registration_status: Confirmed or waitlist RSVP status.
        event_title: Event display title.
        event_date: Event start time.
        event_id: Event identifier used for the dashboard link.
        confirmed_count: Current number of confirmed participants.
        max_participants: Event capacity, or None for unlimited capacity.

    Returns:
        Resend response, or a skipped/error status dictionary.
    """
    if not settings.RESEND_API_KEY:
        logger.debug(
            "Skipping ride leader registration alert (no RESEND_API_KEY): %s",
            leader_email,
        )
        return {"status": "skipped", "reason": "no_api_key"}

    frontend_url = settings.PUBLIC_FRONTEND_URL or "https://www.across-cc.de"
    dashboard_url = f"{frontend_url}/dashboard/events/{event_id}"
    date_text = event_date.strftime("%Y-%m-%d %H:%M")
    status_text = escape(registration_status.replace("_", " ").title())
    capacity_text = (
        f"{confirmed_count} / {max_participants}"
        if max_participants is not None
        else str(confirmed_count)
    )
    safe_leader_name = escape(leader_name)
    safe_participant_name = escape(participant_name)
    safe_event_title = escape(event_title)
    subject_event = " ".join(event_title.splitlines()).strip()
    subject_participant = " ".join(participant_name.splitlines()).strip()
    subject_status = " ".join(registration_status.splitlines()).strip()
    subject = (
        f"New {subject_status} RSVP for {subject_event}: "
        f"{subject_participant}"
    )
    html_body = f"""<div style="font-family:Arial,sans-serif;max-width:600px;">
<h2 style="color:#C62828;">New Event Registration</h2>
<p>Hi {safe_leader_name},</p>
<p><strong>{safe_participant_name}</strong> has registered for an event where
you receive ride-leader alerts.</p>
<ul>
  <li><strong>Event:</strong> {safe_event_title}</li>
  <li><strong>Date:</strong> {date_text}</li>
  <li><strong>Registration status:</strong> {status_text}</li>
  <li><strong>Confirmed riders:</strong> {capacity_text}</li>
</ul>
<p><a href="{dashboard_url}">Open the event dashboard</a></p>
<p>— ACC ClubHub Team</p>
{_CONTACT["en"]}
</div>"""
    params = {
        "from": "ACC ClubHub <noreply@events.across-cc.de>",
        "to": [leader_email],
        "subject": subject,
        "html": html_body,
    }
    try:
        return resend.Emails.send(params)
    except Exception as exc:
        logger.error(
            "Failed to send ride leader registration alert to %s: %s",
            leader_email,
            exc,
            exc_info=True,
        )
        return {"status": "error", "message": str(exc)}


def send_slot_claim_confirmation(
    owner_email: str,
    owner_name: str,
    event_type_label: str,
    planned_date: str,
    slot_id: int,
) -> dict:
    """Notify the slot owner that they have claimed a planning slot."""
    if not settings.RESEND_API_KEY:
        logger.debug("Skipping slot claim email (no RESEND_API_KEY): %s", owner_email)
        return {"status": "skipped", "reason": "no_api_key"}

    subject = f"You've claimed a planning slot: {event_type_label} on {planned_date}"
    html_body = f"""<div style="font-family:Arial,sans-serif;max-width:600px;">
<h2 style="color:#C62828;">🚴 Planning Slot Claimed</h2>
<p>Hi {owner_name},</p>
<p>You are now the owner of the following planning slot:</p>
<ul>
  <li><strong>Event type:</strong> {event_type_label}</li>
  <li><strong>Planned date:</strong> {planned_date}</li>
</ul>
<p>You'll receive a reminder email 7 days before the event date. Please keep your plans on track!</p>
<p>— ACC ClubHub Admin</p>
{_CONTACT["en"]}
</div>"""

    params = {
        "from": "ACC ClubHub <noreply@events.across-cc.de>",
        "to": [owner_email],
        "subject": subject,
        "html": html_body,
    }
    try:
        return resend.Emails.send(params)
    except Exception as e:
        logger.error("Failed to send slot claim email to %s: %s", owner_email, e, exc_info=True)
        return {"status": "error", "message": str(e)}


def send_slot_assignment_notification(
    owner_email: str,
    owner_name: str,
    event_type_label: str,
    planned_date: str,
    slot_id: int,
) -> dict:
    """Notify a ride leader that they were assigned a planning slot."""
    if not settings.RESEND_API_KEY:
        logger.debug(
            "Skipping slot assignment email (no RESEND_API_KEY): %s",
            owner_email,
        )
        return {"status": "skipped", "reason": "no_api_key"}

    subject = (
        f"你已被分配为活动策划负责人: {event_type_label} on {planned_date}"
    )
    html_body = f"""<div style="font-family:Arial,sans-serif;max-width:600px;">
<h2 style="color:#C62828;">🚴 活动策划 Owner 分配通知</h2>
<p>{owner_name}，你好：</p>
<p>你已被分配为这个活动策划坑位的负责人。
请提前准备路线、活动 idea 或必要说明。</p>
<p>You have been assigned as the owner for this season planning slot.
Please prepare the route, ride idea, or necessary notes in advance.</p>
<ul>
  <li><strong>活动类型 / Event type:</strong> {event_type_label}</li>
  <li><strong>计划日期 / Planned date:</strong> {planned_date}</li>
  <li><strong>Slot ID:</strong> {slot_id}</li>
</ul>
<p>如果这个时间不合适，请自行协调换班，
并在 dashboard 中更新 owner 或 backup 说明。</p>
<p>If this date does not work for you, please coordinate a replacement
and update the owner or backup notes in the dashboard.</p>
<p>—— ACC ClubHub Admin</p>
{_CONTACT["zh"]}
</div>"""

    params = {
        "from": "ACC ClubHub <noreply@events.across-cc.de>",
        "to": [owner_email],
        "subject": subject,
        "html": html_body,
    }
    try:
        return resend.Emails.send(params)
    except Exception as e:
        logger.error(
            "Failed to send slot assignment email to %s: %s",
            owner_email,
            e,
            exc_info=True,
        )
        return {"status": "error", "message": str(e)}


def send_slot_reminder(
    owner_email: str,
    owner_name: str,
    event_type_label: str,
    planned_date: str,
    slot_id: int,
) -> dict:
    """Send a 7-day-before reminder to the slot owner."""
    if not settings.RESEND_API_KEY:
        logger.debug("Skipping slot reminder email (no RESEND_API_KEY): %s", owner_email)
        return {"status": "skipped", "reason": "no_api_key"}

    subject = f"Reminder: your planned event is in 7 days — {event_type_label} on {planned_date}"
    html_body = f"""<div style="font-family:Arial,sans-serif;max-width:600px;">
<h2 style="color:#C62828;">⏰ Event Reminder — 7 Days Away</h2>
<p>Hi {owner_name},</p>
<p>This is a friendly reminder that your planned event is coming up in <strong>7 days</strong>:</p>
<ul>
  <li><strong>Event type:</strong> {event_type_label}</li>
  <li><strong>Planned date:</strong> {planned_date}</li>
</ul>
<p>Please make sure everything is ready: route, participants, logistics.</p>
<p>— ACC ClubHub Admin</p>
{_CONTACT["en"]}
</div>"""

    params = {
        "from": "ACC ClubHub <noreply@events.across-cc.de>",
        "to": [owner_email],
        "subject": subject,
        "html": html_body,
    }
    try:
        return resend.Emails.send(params)
    except Exception as e:
        logger.error("Failed to send slot reminder to %s: %s", owner_email, e, exc_info=True)
        return {"status": "error", "message": str(e)}


def send_subscription_confirmation_email(
    email: str,
    name: str,
    lang: str = "zh",
    unsubscribe_token: str = "",
) -> dict:
    """Send subscription confirmation email when a new subscriber is created."""
    if not settings.RESEND_API_KEY:
        logger.debug("Skipping subscription confirmation email (no RESEND_API_KEY): %s", email)
        return {"status": "skipped", "reason": "no_api_key"}

    frontend_url = settings.PUBLIC_FRONTEND_URL or "https://www.across-cc.de"
    unsubscribe_url = (
        f"{frontend_url}/api/unsubscribe/{unsubscribe_token}"
        if unsubscribe_token else ""
    )
    unsubscribe_html = (
        f'<p style="font-size:0.85rem;color:#888;">'
        f'<a href="{unsubscribe_url}">Unsubscribe</a></p>'
        if unsubscribe_url else ""
    )

    templates = {
        "zh": {
            "subject": "订阅确认 — ACC ClubHub 活动通知",
            "body": (
                f"<p>您好 {name}，</p>"
                f"<p>您已成功订阅 ACC ClubHub 活动通知。"
                f"每当有新活动发布，我们会第一时间通知您。</p>"
                f"<p>期待与您相见！</p>"
                f"{unsubscribe_html}"
            ),
        },
        "en": {
            "subject": "Subscription confirmed — ACC ClubHub event notifications",
            "body": (
                f"<p>Hi {name},</p>"
                f"<p>You're now subscribed to ACC ClubHub event notifications. "
                f"We'll let you know whenever a new event is published.</p>"
                f"<p>See you on the road!</p>"
                f"{unsubscribe_html}"
            ),
        },
        "de": {
            "subject": "Abo bestätigt — ACC ClubHub Veranstaltungsbenachrichtigungen",
            "body": (
                f"<p>Hallo {name},</p>"
                f"<p>Sie haben die ACC ClubHub Veranstaltungsbenachrichtigungen abonniert. "
                f"Wir informieren Sie, sobald neue Events veröffentlicht werden.</p>"
                f"<p>Bis bald auf der Straße!</p>"
                f"{unsubscribe_html}"
            ),
        },
    }

    template = templates.get(lang, templates["en"])
    params = {
        "from": "ACC ClubHub <noreply@events.across-cc.de>",
        "to": [email],
        "subject": template["subject"],
        "html": template["body"] + _CONTACT.get(lang, _CONTACT["en"]),
    }

    try:
        return resend.Emails.send(params)
    except Exception as e:
        logger.error("Failed to send subscription confirmation to %s: %s", email, e)
        return {"status": "error", "message": str(e)}
