"""Domain validation errors independent of HTTP routing."""


class InvalidDepartureTimeError(ValueError):
    """The requested local departure time is invalid or ambiguous."""


class PublishedEventNotFoundError(ValueError):
    """An activity is not present in the published content source."""


class PublishedEventUnavailableError(RuntimeError):
    """The published content source could not be checked."""
