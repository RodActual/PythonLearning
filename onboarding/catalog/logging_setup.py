"""One place to configure logging, so every module just calls logging.getLogger(__name__)."""

import logging

LOG_FORMAT = "%(asctime)s %(levelname)-7s %(name)s: %(message)s"


def configure_logging(level: str = "INFO") -> None:
    # basicConfig adds a handler only if the root logger has none, so handlers set up by
    # pytest or a host app are kept. The level is applied either way.
    logging.basicConfig(format=LOG_FORMAT)
    logging.getLogger().setLevel(level)
