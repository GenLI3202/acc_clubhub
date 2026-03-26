"""
ACC ClubHub Backend - Email Notification Service  
Phase 4.3.3: Resend integration for event confirmations
"""

from typing import Optional
from datetime import datetime
from config import settings
import resend

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
) -> dict:
    """Send RSVP confirmation email"""
    if not settings.RESEND_API_KEY:
        print(f"[DEBUG] Skipping email (no RESEND_API_KEY): {user_email}")
        return {"status": "skipped", "reason": "no_api_key"}

    date_str = event_date.strftime("%Y-%m-%d %H:%M")
    
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
<p>Viel Spaß beim Radfahren!</p>
<p>—— ACC ClubHub Team</p>""",
        },
    }

    template = templates.get(lang, templates["zh"])
    html_body = f"""<div style="font-family: Arial, sans-serif; max-width: 600px;">
<h2 style="color: #2A5CA6;">🚴 {template["subject"]}</h2>
{template["body"]}
</div>"""

    params = {
        "from": "ACC ClubHub <noreply@acc-clubhub.de>",
        "to": [user_email],
        "subject": template["subject"],
        "html": html_body,
    }

    try:
        return resend.Emails.send(params)
    except Exception as e:
        print(f"[ERROR] Failed to send email: {e}")
        return {"status": "error", "message": str(e)}


def send_waitlist_email(
    user_email: str,
    user_name: str,
    event_title: str,
    waitlist_position: int,
    lang: str = "zh",
) -> dict:
    """Send waitlist notification email"""
    if not settings.RESEND_API_KEY:
        return {"status": "skipped"}

    templates = {
        "zh": {"subject": f"已加入等待名单: {event_title}"},
        "en": {"subject": f"Joined Waitlist: {event_title}"},
    }
    
    template = templates.get(lang, templates["zh"])
    body_templates = {
        "zh": f"<p>\u60a8\u597d {user_name}\uff0c\u60a8\u5728 {event_title} \u7684\u7b49\u5f85\u540d\u5355\u4e2d\u6392\u7b2c {waitlist_position} \u4f4d\u3002</p>",
        "en": f"<p>Hello {user_name}, you are #{waitlist_position} on the waitlist for {event_title}.</p>",
        "de": f"<p>Hallo {user_name}, Sie sind Nr. {waitlist_position} auf der Warteliste f\u00fcr {event_title}.</p>",
    }
    html_body = body_templates.get(lang, body_templates["en"])

    params = {
        "from": "ACC ClubHub <noreply@acc-clubhub.de>",
        "to": [user_email],
        "subject": template["subject"],
        "html": html_body,
    }

    try:
        return resend.Emails.send(params)
    except Exception as e:
        return {"status": "error", "message": str(e)}
