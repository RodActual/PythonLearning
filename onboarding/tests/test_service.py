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


def test_delete_survives_search_outage(repo, make_item, caplog):
    item = repo.add(make_item())
    search = MagicMock()
    search.remove.side_effect = ConnectionError("search is down")

    with caplog.at_level(logging.ERROR):
        CatalogService(repo, search).delete(item.id)

    assert repo.get(item.id) is None
    assert f"removing item {item.id} from search failed" in caplog.text


def test_search_overfetches_and_drops_stale_ids(repo, make_item):
    items = [repo.add(make_item(name=f"item {i}")) for i in range(3)]
    search = MagicMock()
    search.search.return_value = [998, items[0].id, 999, items[1].id, items[2].id]

    found = CatalogService(repo, search).search("item", limit=2)

    assert [i.id for i in found] == [items[0].id, items[1].id]
    assert search.search.call_args.kwargs["limit"] == 4
    search.remove.assert_any_call(998)
    search.remove.assert_any_call(999)
