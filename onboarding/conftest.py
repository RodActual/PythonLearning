"""Fixtures shared by tests/ and exercises/. pytest loads this file automatically."""

import logging
from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from catalog.api import create_app
from catalog.config import Settings
from catalog.db import init_db, make_engine, make_session_factory
from catalog.models import ItemCreate
from catalog.repository import ItemRepository
from catalog.search import InMemorySearch


@pytest.fixture(autouse=True)
def _restore_log_level():
    """create_app sets the catalog logger's level; put it back so tests don't affect each other."""
    logger = logging.getLogger("catalog")
    level = logger.level
    yield
    logger.setLevel(level)


@pytest.fixture
def settings() -> Settings:
    # "sqlite://" is an in-memory database: each test starts empty.
    return Settings(database_url="sqlite://", search_backend="memory")


@pytest.fixture
def search() -> InMemorySearch:
    return InMemorySearch()


@pytest.fixture
def client(settings: Settings, search: InMemorySearch) -> Iterator[TestClient]:
    with TestClient(create_app(settings, search=search)) as c:
        yield c


@pytest.fixture
def session() -> Iterator[Session]:
    engine = make_engine("sqlite://")
    init_db(engine)
    with make_session_factory(engine)() as s:
        yield s


@pytest.fixture
def repo(session: Session) -> ItemRepository:
    return ItemRepository(session)


@pytest.fixture
def make_item():
    """Factory fixture: call it to build a valid ItemCreate, overriding any field."""

    def _make(**overrides) -> ItemCreate:
        data = {
            "name": "Sales orders",
            "kind": "dataset",
            "owner": "data-team",
            "description": "Daily sales orders from the ERP",
            "tags": ["sales", "erp"],
            "metadata": {"rows": 1200},
        }
        data.update(overrides)
        return ItemCreate(**data)

    return _make
