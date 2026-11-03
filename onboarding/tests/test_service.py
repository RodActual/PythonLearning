import logging
from unittest.mock import MagicMock

import pytest

from catalog.service import CatalogService, ItemNotFoundError


def test_register_indexes_the_item(repo, make_item):
    search = MagicMock()
    item = CatalogService(repo, search).register(make_item())
    search.index.assert_called_once_with(item)


def test_register_survives_search_outage(repo, make_item, caplog):
    search = MagicMock()
    search.index.side_effect = ConnectionError("search is down")
    service = CatalogService(repo, search)

    with caplog.at_level(logging.ERROR):
        item = service.register(make_item())

    assert repo.get(item.id) is not None
    assert f"indexing failed for item {item.id}" in caplog.text


def test_search_skips_ids_missing_from_database(repo, make_item):
    item = repo.add(make_item())
    search = MagicMock()
    search.search.return_value = [999, item.id]
    assert [i.id for i in CatalogService(repo, search).search("sales")] == [item.id]


def test_get_missing_raises(repo):
    with pytest.raises(ItemNotFoundError):
        CatalogService(repo, MagicMock()).get(1)
