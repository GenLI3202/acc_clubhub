import { h } from 'preact';
import { useState } from 'preact/hooks';
import type { VNode } from 'preact';
import type { Locale } from '../lib/i18n';
import { t } from '../lib/i18n';

interface EventRegistrationFormProps {
    eventId: number;
    eventSlug: string;
    availableSpots: number | null;
    isDeadlinePassed: boolean;
    lang: Locale;
    apiUrl: string;
}

interface FormData {
    email: string;
    name: string;
    notes: string;
    privacy_accepted: boolean;
    subscribe: boolean;
}

export function EventRegistrationForm({
    eventId,
    eventSlug,
    availableSpots,
    isDeadlinePassed,
    lang,
    apiUrl,
}: EventRegistrationFormProps): VNode {
    const [formData, setFormData] = useState<FormData>({
        email: '',
        name: '',
        notes: '',
        privacy_accepted: false,
        subscribe: false,
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

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
            const response = await fetch(`${apiUrl}/api/events/${eventId}/rsvp`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (!response.ok) {
                if (data.detail?.includes('already registered')) {
                    throw new Error(t(lang, 'event.errorDuplicate'));
                } else if (data.detail?.includes('deadline')) {
                    throw new Error(t(lang, 'event.errorDeadline'));
                } else {
                    throw new Error(data.detail || 'Registration failed');
                }
            }

            setSuccess(true);
            setFormData({
                email: '',
                name: '',
                notes: '',
                privacy_accepted: false,
                subscribe: false,
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="rsvp-success">
                <h3>✓ {t(lang, 'event.success')}</h3>
                <p>{availableSpots !== null && availableSpots <= 0 
                    ? t(lang, 'event.waitlistSuccess') 
                    : t(lang, 'event.success')
                }</p>
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
        zh: '活动报名',
        en: 'Event Registration',
        de: 'Anmeldung',
    }[lang] || 'Registration';

    return (
        <form className="event-registration-form" onSubmit={handleSubmit} data-title={formTitle}>
            <div className="spots-indicator">
                {availableSpots !== null && (
                    <span className={availableSpots > 0 ? 'spots-available' : 'spots-full'}>
                        {availableSpots > 0 
                            ? `${t(lang, 'event.spotsAvailable')}: ${availableSpots}`
                            : t(lang, 'event.noSpotsLeft')
                        }
                    </span>
                )}
            </div>

            <div className="form-group">
                <label htmlFor="email">{t(lang, 'event.formEmail')} *</label>
                <input
                    type="email"
                    id="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: (e.target as HTMLInputElement).value })}
                    required
                    disabled={loading}
                />
            </div>

            <div className="form-group">
                <label htmlFor="name">{t(lang, 'event.formName')} *</label>
                <input
                    type="text"
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: (e.target as HTMLInputElement).value })}
                    required
                    disabled={loading}
                />
            </div>

            <div className="form-group">
                <label htmlFor="notes">{t(lang, 'event.formNotes')}</label>
                <textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: (e.target as HTMLTextAreaElement).value })}
                    rows={3}
                    disabled={loading}
                />
            </div>

            <div className="form-group checkbox">
                <label>
                    <input
                        type="checkbox"
                        checked={formData.privacy_accepted}
                        onChange={(e) => setFormData({ ...formData, privacy_accepted: (e.target as HTMLInputElement).checked })}
                        disabled={loading}
                    />
                    <span>{t(lang, 'event.privacyAccept')}</span>
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

            {error && <div className="error-message">{error}</div>}

            <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? t(lang, 'event.registering') : t(lang, 'event.submitBtn')}
            </button>
        </form>
    );
}
