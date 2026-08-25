"""Domain values for event-wide cancellation state."""

from __future__ import annotations

from enum import Enum


class EventCancellationReason(str, Enum):
    """Allowed operational reasons for cancelling an event."""

    WEATHER = "weather"
    INSUFFICIENT_STAFF = "insufficient_staff"
    UNSAFE_CONDITIONS = "unsafe_conditions"
    OTHER = "other"


_ENGLISH_REASON_LABELS = {
    EventCancellationReason.WEATHER: "Adverse weather",
    EventCancellationReason.INSUFFICIENT_STAFF: (
        "Insufficient ride leaders or organisers"
    ),
    EventCancellationReason.UNSAFE_CONDITIONS: "Unsafe route conditions",
    EventCancellationReason.OTHER: "Other operational reasons",
}


def get_cancellation_reason_label(
    reason: EventCancellationReason | str,
) -> str:
    """Return the English label for an event cancellation reason.

    Args:
        reason: Stored cancellation reason code.

    Returns:
        Human-readable English reason label.

    Raises:
        ValueError: If the stored reason is not supported.
    """
    normalized_reason = EventCancellationReason(reason)
    return _ENGLISH_REASON_LABELS[normalized_reason]
