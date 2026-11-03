import pytest
from pydantic import ValidationError

from catalog.config import Settings


def test_defaults(monkeypatch):
    monkeypatch.delenv("CATALOG_DATABASE_URL", raising=False)
    assert Settings(_env_file=None).search_backend == "memory"


def test_reads_environment(monkeypatch):
    monkeypatch.setenv("CATALOG_DATABASE_URL", "postgresql://db/catalog")
    monkeypatch.setenv("CATALOG_SEARCH_BACKEND", "opensearch")
    s = Settings(_env_file=None)
    assert s.database_url == "postgresql://db/catalog"
    assert s.search_backend == "opensearch"


def test_rejects_unknown_backend(monkeypatch):
    monkeypatch.setenv("CATALOG_SEARCH_BACKEND", "solr")
    with pytest.raises(ValidationError):
        Settings(_env_file=None)
