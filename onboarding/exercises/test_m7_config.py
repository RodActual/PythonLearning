"""Module 7 checks. Run: pytest exercises/test_m7_config.py"""

import logging

import pytest
from pydantic import ValidationError

from catalog.api import create_app
from catalog.config import Settings


def test_log_level_default(monkeypatch):
    monkeypatch.delenv("CATALOG_LOG_LEVEL", raising=False)
    assert Settings(_env_file=None).log_level == "INFO"


def test_log_level_from_env_is_uppercased(monkeypatch):
    monkeypatch.setenv("CATALOG_LOG_LEVEL", "debug")
    assert Settings(_env_file=None).log_level == "DEBUG"


def test_log_level_rejects_unknown(monkeypatch):
    monkeypatch.setenv("CATALOG_LOG_LEVEL", "loud")
    with pytest.raises(ValidationError):
        Settings(_env_file=None)


def test_app_applies_log_level():
    create_app(Settings(_env_file=None, database_url="sqlite://", log_level="WARNING"))
    assert logging.getLogger("catalog").level == logging.WARNING
