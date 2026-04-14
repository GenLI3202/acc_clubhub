import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import type { VNode } from 'preact';
import type { Locale } from '../lib/i18n';
import { t } from '../lib/i18n';

interface EventRegistrationFormProps {
    eventSlug: string;
    eventTitle: string;
    eventLocation: string;
    eventDate: string;
    eventType: string;
    maxParticipants: number | null;
    registrationDeadline: string | null;
    wechatQrCode: string | null;
    lang: Locale;
    apiUrl: string;
}

interface FormData {
    email: string;
    name: string;
    notes: string;
    privacy_accepted: boolean;
    subscribe: boolean;
    lang: string;
}

export function EventRegistrationForm({
    eventSlug,
    eventTitle,
    eventLocation,
    eventDate,
    eventType,
    maxParticipants,
    registrationDeadline,
    wechatQrCode,
    lang,
    apiUrl,
}: EventRegistrationFormProps): VNode {
    const isDeadlinePassed = registrationDeadline
        ? new Date(registrationDeadline) < new Date()
        : false;

    const [formData, setFormData] = useState<FormData>({
        email: '',
        name: '',
        notes: '',
        privacy_accepted: false,
        subscribe: false,
        lang,
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [isWaitlist, setIsWaitlist] = useState(false);
    const [submittedEmail, setSubmittedEmail] = useState('');
    // Live spot count fetched from DB; null = unlimited or not yet loaded
    const [spotsRemaining, setSpotsRemaining] = useState<number | null>(maxParticipants);

    useEffect(() => {
        if (maxParticipants === null) return; // unlimited — no need to fetch
        fetch(`${apiUrl}/api/events/${eventSlug}`)
            .then((r) => r.ok ? r.json() : null)
            .then((data) => {
                if (data && typeof data.available_spots === 'number') {
                    setSpotsRemaining(data.available_spots);
                }
            })
            .catch(() => { /* silently keep static maxParticipants as fallback */ });
    }, [eventSlug, apiUrl, maxParticipants]);

    const handleSubmit = async (e: Event) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        if (!formData.privacy_accepted) {
            setError(t(lang, 'event.errorPrivacy'));
            setLoading(false);
            return;
        }

        try {
            const response = await fetch(`${apiUrl}/api/rsvp`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...formData,
                    event_slug: eventSlug,
                    event_title: eventTitle,
                    event_location: eventLocation,
                    event_date: eventDate,
                    event_type: eventType,
                    max_participants: maxParticipants,
                    registration_deadline: registrationDeadline,
                    wechat_qr_code: wechatQrCode,
                }),
            });

            let data: any;
            try {
                data = await response.json();
            } catch {
                throw new Error(t(lang, 'event.errorServer'));
            }

            if (!response.ok) {
                if (data.detail?.includes('already registered')) {
                    throw new Error(t(lang, 'event.errorDuplicate'));
                } else if (data.detail?.includes('deadline')) {
                    throw new Error(t(lang, 'event.errorDeadline'));
                } else {
                    throw new Error(data.detail || t(lang, 'event.errorServer'));
                }
            }

            setIsWaitlist(data.status === 'waitlist');
            setSubmittedEmail(formData.email);
            setSuccess(true);
            // Decrement live spot count immediately after confirmed registration
            if (data.status === 'confirmed') {
                setSpotsRemaining((prev) => (prev !== null && prev > 0 ? prev - 1 : prev));
            }
            setFormData({
                email: '',
                name: '',
                notes: '',
                privacy_accepted: false,
                subscribe: false,
                lang,
            });
        } catch (err) {
            if (err instanceof TypeError && err.message === 'Failed to fetch') {
                setError(t(lang, 'event.errorNetwork'));
            } else {
                setError(err instanceof Error ? err.message : t(lang, 'event.errorServer'));
            }
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="rsvp-success">
                <h3>&#10003; {isWaitlist ? t(lang, 'event.waitlistSuccess') : `${t(lang, 'event.success')}${submittedEmail}`}</h3>
            </div>
        );
    }

    if (isDeadlinePassed) {
        return (
            <div className="rsvp-closed">
                <p>{t(lang, 'event.errorDeadline')}</p>
            </div>
        );
    }

    const formTitle = {
        zh: '活动报名 — let us ride, free and together',
        en: 'Event Registration — let us ride, free and together',
        de: 'Anmeldung — let us ride, free and together',
    }[lang] || 'Registration';

    return (
        <form className="event-registration-form" onSubmit={handleSubmit} data-title={formTitle}>
            {maxParticipants !== null && (
                <div className="spots-indicator">
                    <span className={`spots-available${spotsRemaining === 0 ? ' spots-full' : ''}`}>
                        {spotsRemaining === 0
                            ? t(lang, 'event.noSpotsLeft')
                            : `${t(lang, 'event.spotsAvailable')}: ${spotsRemaining ?? '…'}`}
                    </span>
                </div>
            )}

            {/* Row 1: Email + Name side by side */}
            <div className="form-row">
                <div className="form-group">
                    <label htmlFor="reg-email">{t(lang, 'event.formEmail')} *</label>
                    <input
                        type="email"
                        id="reg-email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: (e.target as HTMLInputElement).value })}
                        required
                        disabled={loading}
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="reg-name">{t(lang, 'event.formName')} *</label>
                    <input
                        type="text"
                        id="reg-name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: (e.target as HTMLInputElement).value })}
                        required
                        disabled={loading}
                    />
                </div>
            </div>

            {/* Row 2: Notes (full width) */}
            <div className="form-group">
                <label htmlFor="reg-notes">{t(lang, 'event.formNotes')}</label>
                <textarea
                    id="reg-notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: (e.target as HTMLTextAreaElement).value })}
                    rows={2}
                    disabled={loading}
                />
            </div>

            {error && <div className="error-message">{error}</div>}

            {/* Footer: checkboxes on left, submit on right */}
            <div className="form-footer">
                <div className="form-footer-checks">
                    <div className="form-group checkbox">
                        <label>
                            <input
                                type="checkbox"
                                checked={formData.privacy_accepted}
                                onChange={(e) => setFormData({ ...formData, privacy_accepted: (e.target as HTMLInputElement).checked })}
                                disabled={loading}
                            />
                            <span>
                                {t(lang, 'event.privacyAcceptPrefix')}{' '}
                                <a href={`/${lang}/privacy`} target="_blank" rel="noopener" className="privacy-link">
                                    {t(lang, 'event.privacyPolicy')}
                                </a>
                            </span>
                        </label>
                    </div>

                    <div className="form-group checkbox">
                        <label>
                            <input
                                type="checkbox"
                                checked={formData.subscribe}
                                onChange={(e) => setFormData({ ...formData, subscribe: (e.target as HTMLInputElement).checked })}
                                disabled={loading}
                            />
                            <span>{t(lang, 'event.subscribe')}</span>
                        </label>
                    </div>
                </div>

                <button type="submit" className="submit-btn" disabled={loading}>
                    {loading ? t(lang, 'event.registering') : t(lang, 'event.submitBtn')}
                </button>
            </div>
        </form>
    );
}
