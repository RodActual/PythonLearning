"""One place to configure logging, so every module just calls logging.getLogger(__name__)."""

import logging

LOG_FORMAT = "%(asctime)s %(levelname)-7s %(name)s: %(message)s"


def configure_logging(level: str = "INFO") -> None:
    logging.basicConfig(level=level, format=LOG_FORMAT, force=True)
