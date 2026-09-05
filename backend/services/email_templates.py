"""Render ACC transactional email cards as HTML and plain text."""

from datetime import datetime
from html import escape
from urllib.parse import quote, urljoin, urlsplit

from services.event_cancellation import get_cancellation_reason_label
from services.event_schedule import format_event_time

RED = "#C62828"
INK = "#1A1A1A"
MUTED = "#666666"
KOMOOT_GREEN = "#6AA127"
KOMOOT_INK = "#42661C"
KOMOOT_SURFACE = "#F5F8F0"
FONT = "Arial, Helvetica, 'PingFang SC', 'Microsoft YaHei', sans-serif"
SIGNATURE = "Let's Ride, Free and Together"
MOTTO = "Across Paths · Mountains · Borders"
CONTACT = "letusride@across-cc.de"


def _paragraph(value: str) -> str:
    """Escape a paragraph and apply email-safe spacing."""
    return f'<p style="margin:0 0 18px;line-height:1.75;">{escape(value)}</p>'


def _safe_url(value: str) -> str:
    """Keep only absolute HTTP links for email images and actions."""
    try:
        parsed = urlsplit(value.strip())
    except ValueError:
        return ""
    return value.strip() if parsed.scheme in {"http", "https"} and parsed.netloc else ""


def _render_card(
    *,
    subject: str,
    lang: str,
    label: str,
    title: str,
    greeting: str,
    intro: str,
    facts: list[tuple[str, str]],
    paragraphs: list[str],
    links: list[tuple[str, str]],
    frontend_url: str,
    komoot_route: str = "",
    secondary_action: str = "",
    secondary_intro: str = "",
    secondary_note: str = "",
    footer_link: tuple[str, str] | None = None,
    qr: tuple[str, str] | None = None,
) -> dict[str, str]:
    """Render supplied copy using a fluid table with an Outlook width fallback."""
    rows = "".join(
        "<tr>"
        f'<td width="30%" valign="top" style="padding:14px 12px;'
        f"color:{MUTED};font-size:12px;"
        f'{"border-top:1px solid #E5E5E2;" if index else ""}">'
        f"{escape(key)}</td>"
        '<td width="70%" valign="top" style="padding:14px 12px;'
        "font-weight:600;word-wrap:break-word;"
        f'{"border-top:1px solid #E5E5E2;" if index else ""}">'
        f"{escape(value)}</td></tr>"
        for index, (key, value) in enumerate(facts)
    )
    facts_html = (
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0"'
        ' border="0" bgcolor="#F4F4F1" style="width:100%;table-layout:fixed;'
        "border-collapse:separate;border-spacing:0;border-radius:8px;"
        f"background-color:#F4F4F1;color:{INK};"
        f'font-family:{FONT};font-size:14px;line-height:1.6;margin-bottom:24px;">'
        f"{rows}</table>"
        if facts
        else ""
    )
    links = [(text, _safe_url(url)) for text, url in links if _safe_url(url)]
    links_html = ""
    for index, (text, url) in enumerate(links):
        is_secondary = bool(secondary_action) and url == _safe_url(secondary_action)
        if is_secondary and secondary_intro:
            links_html += _paragraph(secondary_intro)
        if index == 0 or is_secondary:
            is_komoot = bool(komoot_route) and url == _safe_url(komoot_route)
            background = KOMOOT_SURFACE if is_komoot else RED
            border = KOMOOT_GREEN if is_komoot else RED
            ink = KOMOOT_INK if is_komoot else "#FFFFFF"
            if is_secondary:
                background, border, ink = "#FFFFFF", RED, RED
            button_gap = "8px" if is_secondary and secondary_note else "18px"
            links_html += (
                '<table role="presentation" cellpadding="0" cellspacing="0"'
                f' border="0" style="margin:2px 0 {button_gap};'
                'border-collapse:separate;'
                'border-spacing:0;"><tr>'
                f'<td bgcolor="{background}" style="background-color:{background};'
                f"border:1px solid {border};border-radius:5px;"
                'padding:9px 14px;mso-padding-alt:9px 14px;">'
                f'<a href="{escape(url, quote=True)}" style="color:{ink};'
                f"font-family:{FONT};font-size:13px;font-weight:600;line-height:20px;"
                f'text-decoration:none;display:inline-block;border-radius:5px;">'
                f"{escape(text)}</a>"
                "</td></tr></table>"
            )
            if is_secondary and secondary_note:
                links_html += (
                    '<p style="margin:0 0 22px;font-size:12px;'
                    'line-height:1.6;color:#888888;">'
                    f"{escape(secondary_note)}</p>"
                )
        else:
            links_html += (
                '<p style="margin:0 0 18px;font-size:13px;">'
                f'<a href="{escape(url, quote=True)}" style="color:{RED};'
                f'text-decoration:underline;">{escape(text)}</a></p>'
            )
    qr_url = _safe_url(qr[1]) if qr else ""
    qr_html = (
        f'{_paragraph(qr[0])}<p style="margin:0 0 24px;">'
        f'<img src="{escape(qr_url, quote=True)}" alt="WeChat QR Code"'
        ' width="180" height="180" style="display:block;width:180px;'
        'height:180px;max-width:100%;border:0;" /></p>'
        if qr and qr_url
        else ""
    )
    contact_label = {
        "zh": "有疑问？写信联系我们 📧",
        "en": "Questions? Email us 📧",
        "de": "Fragen? Schreib uns 📧",
    }[lang]
    footer = (
        f'<a href="mailto:{CONTACT}" style="color:{RED};'
        f'text-decoration:underline;">{escape(contact_label)}</a>'
    )
    footer_text = f"{contact_label} {CONTACT}"
    if footer_link and _safe_url(footer_link[1]):
        footer += (
            "<br /><br />"
            f'<a href="{escape(footer_link[1], quote=True)}"'
            f' style="color:{MUTED};text-decoration:underline;">'
            f"{escape(footer_link[0])}</a>"
        )
        footer_text += f"\n{footer_link[0]}: {footer_link[1]}"
    calligraphy_url = _safe_url(
        f"{frontend_url.rstrip('/')}/images/about/chuanyue-wujiang.png",
    )
    html = (
        f'<!doctype html><html lang="{lang}"><head><meta charset="UTF-8" />'
        '<meta name="viewport" content="width=device-width,initial-scale=1" />'
        f"<title>{escape(subject)}</title></head>"
        '<body style="margin:0;padding:0;background-color:#F3F3F1;">'
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0"'
        ' border="0" bgcolor="#F3F3F1" style="width:100%;border-collapse:collapse;">'
        '<tr><td align="center" style="padding:24px 8px;">'
        '<!--[if mso]><table role="presentation" width="600" cellpadding="0"'
        ' cellspacing="0" border="0"><tr><td><![endif]-->'
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0"'
        ' border="0" bgcolor="#FFFFFF" style="width:100%;max-width:600px;'
        "border-collapse:separate;border-spacing:0;border-radius:8px;"
        f"font-family:{FONT};font-size:15px;"
        f'line-height:1.75;color:{INK};background-color:#FFFFFF;">'
        f'<tr><td bgcolor="{RED}" style="padding:22px 24px;'
        f"border-radius:8px 8px 0 0;background-color:{RED};"
        'color:#FFFFFF;"><span style="font-size:24px;font-weight:600;">ACC</span>'
        '<br /><span style="font-size:10px;letter-spacing:0.8px;">'
        "ACROSS CYCLING CLUB · MUNICH</span></td></tr>"
        '<tr><td style="padding:28px 24px 8px;">'
        f'<p style="margin:0 0 10px;font-size:11px;color:{MUTED};">'
        f"{escape(label)}</p>"
        '<h1 style="margin:0 0 22px;font-size:22px;line-height:1.4;'
        f'font-weight:600;color:{INK};">{escape(title)}</h1>'
        f"{_paragraph(greeting)}{_paragraph(intro)}{facts_html}"
        f"{''.join(_paragraph(item) for item in paragraphs)}"
        f"{links_html}{qr_html}"
        '<p style="margin:28px 0 6px;font-size:14px;font-weight:600;">'
        f"{escape(SIGNATURE)}</p>"
        f'<p style="margin:0 0 14px;font-size:12px;color:{MUTED};">'
        f"{MOTTO}</p>"
        '<table role="presentation" cellpadding="0" cellspacing="0" border="0"'
        ' bgcolor="#FFFFFF"><tr><td bgcolor="#FFFFFF" style="padding:4px 0 12px;">'
        f'<img src="{escape(calligraphy_url, quote=True)}" alt="穿越无疆"'
        ' width="180" height="57" style="display:block;width:180px;height:57px;'
        'border:0;color:#1A1A1A;background-color:#FFFFFF;" />'
        "</td></tr></table></td></tr>"
        f'<tr><td style="padding:20px 24px 28px;color:{MUTED};font-size:12px;'
        'border-top:1px solid #E5E5E2;border-radius:0 0 8px 8px;">'
        f"{footer}</td></tr></table>"
        "<!--[if mso]></td></tr></table><![endif]-->"
        "</td></tr></table></body></html>"
    )
    text_parts = [title, greeting, intro]
    text_parts.extend(f"{key}: {value}" for key, value in facts)
    text_parts.extend(paragraphs)
    for link_label, url in links:
        is_secondary = bool(secondary_action) and url == _safe_url(secondary_action)
        if is_secondary and secondary_intro:
            text_parts.append(secondary_intro)
        text_parts.append(f"{link_label}: {url}")
        if is_secondary and secondary_note:
            text_parts.append(secondary_note)
    if qr and qr_url:
        text_parts.append(f"{qr[0]}: {qr_url}")
    text_parts.extend([SIGNATURE, MOTTO, "穿越无疆", footer_text])
    return {"subject": subject, "html": html, "text": "\n\n".join(text_parts)}


def registration_cancellation_action(
    frontend_url: str, lang: str, event_slug: str, view_token: str,
) -> tuple[str, str, str, str]:
    """Build localized self-cancellation copy and a private confirmation-page URL.

    Args:
        frontend_url: Public site origin.
        lang: Recipient locale.
        event_slug: Stable event identifier.
        view_token: Recipient's private registration token.

    Returns:
        Button label, introduction, privacy note, and URL (empty without a token).
    """
    lang = lang if lang in {"zh", "en", "de"} else "en"
    label, intro, note = {
        "zh": (
            "取消我的报名",
            "临时有事无法参加？你可以在出发前点击下方“取消我的报名”，"
            "无需登录，在页面确认后即可取消并释放名额。",
            "此为你的个人专属取消链接，请勿分享给他人。",
        ),
        "en": (
            "Cancel my registration",
            "Can't make it? Before departure, use the button below to cancel "
            "your registration and free up your place. No login is needed; "
            "you'll confirm on the page.",
            "This cancellation link is personal. Please don't share it with others.",
        ),
        "de": (
            "Meine Anmeldung stornieren",
            "Du kannst nicht teilnehmen? Über den Button unten kannst du vor "
            "dem Start deine Anmeldung stornieren und deinen Platz freigeben. "
            "Du brauchst kein Login und bestätigst auf der Seite.",
            "Dieser Stornierungslink ist persönlich. "
            "Bitte teile ihn nicht mit anderen.",
        ),
    }[lang]
    url = (
        f"{frontend_url.rstrip('/')}/{lang}/events/{quote(event_slug, safe='')}"
        f"?token={quote(view_token, safe='')}#registration-management"
        if event_slug and view_token else ""
    )
    return label, intro, note, _safe_url(url)


def confirmation_card(
    *,
    user_name: str,
    event_title: str,
    event_date: datetime,
    event_location: str | None,
    lang: str,
    frontend_url: str,
    event_slug: str,
    view_token: str,
    wechat_qr_code: str | None,
    route_komoot_url: str | None,
) -> dict[str, str]:
    """Build a personal ride confirmation with optional route and group links.

    Args:
        user_name: Name supplied by the registrant.
        event_title: Ride title.
        event_date: Effective departure timestamp.
        event_location: Meeting point, or None if undecided.
        lang: Recipient locale.
        frontend_url: Public site origin.
        event_slug: Stable ride identifier.
        view_token: Recipient's participant access token.
        wechat_qr_code: Optional group QR image URL or relative path.
        route_komoot_url: Optional public route URL.

    Returns:
        Email subject, HTML and plain-text alternative.
    """
    lang = lang if lang in {"zh", "en", "de"} else "zh"
    copy = {
        "zh": (
            "报名确认",
            f"{user_name}，你好！",
            f"欢迎参加我们的 {event_title} "
            "骑行活动。请按下方的时间到集合点，我们不见不散。",
            "出发时间（慕尼黑当地时间）",
            "集合地点",
            "待定",
            "查看 Komoot 路线",
            "查看参与名单",
            "微信群二维码",
        ),
        "en": (
            "Registration Confirmed",
            f"Hi {user_name},",
            f"Welcome to our {event_title} ride. Meet us at the place "
            "and time below — we'll see you there.",
            "Departure (Munich local time)",
            "Meeting point",
            "To be confirmed",
            "View route on Komoot",
            "View participant list",
            "WeChat group QR code",
        ),
        "de": (
            "Anmeldung bestätigt",
            f"Hallo {user_name},",
            f"Schön, dass du bei unserer Ausfahrt {event_title} dabei "
            "bist. Komm bitte zur unten angegebenen Zeit zum "
            "Treffpunkt. Wir freuen uns auf dich!",
            "Start (Ortszeit München)",
            "Treffpunkt",
            "Wird noch bekannt gegeben",
            "Route auf Komoot ansehen",
            "Teilnehmerliste ansehen",
            "QR-Code der WeChat-Gruppe",
        ),
    }[lang]
    label, greeting, intro, time_label, place_label, tbd, route, people, group = copy
    links = [(route, route_komoot_url)] if route_komoot_url else []
    (cancel_label, cancel_intro, cancel_note, cancel_url) = (
        registration_cancellation_action(
            frontend_url, lang, event_slug, view_token,
        )
    )
    if event_slug and view_token:
        links.append(
            (
                people,
                f"{frontend_url.rstrip('/')}/{lang}/events/"
                f"{quote(event_slug, safe='')}?token={quote(view_token, safe='')}",
            )
        )
    if cancel_url:
        links.append((cancel_label, cancel_url))
    qr = (
        (group, urljoin(frontend_url.rstrip("/") + "/", wechat_qr_code))
        if wechat_qr_code
        else None
    )
    return _render_card(
        subject=f"{label}: {event_title}",
        lang=lang,
        label=label,
        title=event_title,
        greeting=greeting,
        intro=intro,
        facts=[
            (time_label, format_event_time(event_date)),
            (place_label, event_location or tbd),
        ],
        paragraphs=[],
        links=links,
        frontend_url=frontend_url,
        komoot_route=route_komoot_url or "",
        secondary_action=cancel_url,
        secondary_intro=cancel_intro,
        secondary_note=cancel_note,
        qr=qr,
    )


def subscription_card(
    *,
    user_name: str,
    lang: str,
    frontend_url: str,
    unsubscribe_token: str,
) -> dict[str, str]:
    """Confirm ride announcements without implying registration for an event.

    Args:
        user_name: Name supplied by the subscriber.
        lang: Recipient locale.
        frontend_url: Public site origin.
        unsubscribe_token: Recipient's unsubscribe token.

    Returns:
        Email subject, HTML and plain-text alternative.
    """
    lang = lang if lang in {"zh", "en", "de"} else "en"
    label, greeting, intro, note, unsubscribe = {
        "zh": (
            "订阅已确认",
            f"{user_name}，你好！",
            "欢迎订阅 ACC 活动通知。之后的骑行活动会发到这个邮箱，看到"
            "合适的路线和时间，再来报名就好。",
            "这封邮件确认的是活动通知订阅；参加骑行时仍需单独报名。",
            "取消订阅",
        ),
        "en": (
            "Subscription confirmed",
            f"Hi {user_name},",
            "Welcome to ACC ride updates. We'll send ride announcements "
            "to this address. When a route and date work for you, sign "
            "up and join us.",
            "This subscription is for ride announcements. Register "
            "separately for each ride you'd like to join.",
            "Unsubscribe",
        ),
        "de": (
            "Abo bestätigt",
            f"Hallo {user_name},",
            "Willkommen bei den ACC-Toureninfos. Wir schicken dir "
            "unsere Ausfahrten an diese Adresse. Wenn Route und Termin "
            "für dich passen, melde dich gern an.",
            "Du hast die Toureninfos abonniert. Für eine Ausfahrt "
            "meldest du dich jeweils separat an.",
            "Abbestellen",
        ),
    }[lang]
    footer_link = (
        (
            unsubscribe,
            f"{frontend_url.rstrip('/')}/api/unsubscribe/"
            f"{quote(unsubscribe_token, safe='')}",
        )
        if unsubscribe_token
        else None
    )
    return _render_card(
        subject=f"{label} — ACC ClubHub",
        lang=lang,
        label="ACC CLUBHUB",
        title=label,
        greeting=greeting,
        intro=intro,
        facts=[],
        paragraphs=[note],
        links=[],
        frontend_url=frontend_url,
        footer_link=footer_link,
    )


def rescheduling_card(
    *,
    user_name: str,
    event_title: str,
    previous_event_date: datetime,
    event_date: datetime,
    reason: str,
    event_slug: str,
    event_location: str | None,
    frontend_url: str,
) -> dict[str, str]:
    """Explain the change in prose and highlight only the new meeting details.

    Args:
        user_name: Name supplied by the registrant.
        event_title: Ride title.
        previous_event_date: Departure before the change.
        event_date: Newly saved departure timestamp.
        reason: Validated reason code.
        event_slug: Stable ride identifier.
        event_location: Current meeting point.
        frontend_url: Public site origin.

    Returns:
        Email subject, HTML and plain-text alternative.

    Raises:
        ValueError: If the reason code is unsupported.
    """
    reason_label = get_cancellation_reason_label(reason).lower()
    intro = (
        f"We've moved {event_title} because of {reason_label}. "
        f"We were originally due to leave on {format_event_time(previous_event_date)}; "
        "here's the new plan."
    )
    return _render_card(
        subject=f"Departure Time Changed: {event_title}",
        lang="en",
        label="DEPARTURE TIME CHANGED",
        title=event_title,
        greeting=f"Hi {user_name},",
        intro=intro,
        facts=[
            ("New departure (Munich local time)", format_event_time(event_date)),
            ("Meeting point", event_location or "To be confirmed"),
        ],
        paragraphs=[
            "Your registration status is unchanged, including any waitlist position. "
            "You don't need to register again.",
            "If the new date or time doesn't work for you, let us know.",
        ],
        links=[
            (
                "View updated event details",
                f"{frontend_url.rstrip('/')}/en/events/{quote(event_slug, safe='')}",
            )
        ],
        frontend_url=frontend_url,
    )
