"""Domain validation errors independent of HTTP routing."""


class InvalidDepartureTimeError(ValueError):
    """The requested local departure time is invalid or ambiguous."""
