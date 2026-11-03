import os
from datetime import UTC, datetime
from unittest.mock import MagicMock

import pytest

from catalog.models import Item
from catalog.search import InMemorySearch, OpenSearchSearch


def _item(item_id: int, name: str, tags: list[str], description: str = "") -> Item:
    return Item(
        id=item_id, name=name, kind="dataset", owner="o", description=description,
        tags=tags, created_at=datetime.now(UTC),
    )


def test_in_memory_ranks_by_matching_words():
    s = InMemorySearch()
    s.index(_item(1, "Sales orders", ["erp"]))
    s.index(_item(2, "Sales orders by region", ["erp", "sales"]))
    s.index(_item(3, "Payroll", ["hr"]))
    assert s.search("sales region") == [2, 1]
    assert s.search("nothing") == []


def test_in_memory_remove():
    s = InMemorySearch()
    s.index(_item(1, "Sales", []))
    s.remove(1)
    assert s.search("sales") == []


def test_opensearch_builds_query_with_tag_filter():
    # MagicMock stands in for the real client, so no server is needed.
    client = MagicMock()
    client.search.return_value = {"hits": {"hits": [{"_id": "7"}, {"_id": "3"}]}}
    backend = OpenSearchSearch(client, "catalog-items")

    assert backend.search("sales", tag="ERP", limit=5) == [7, 3]

    body = client.search.call_args.kwargs["body"]
    assert body["size"] == 5
    assert body["query"]["bool"]["filter"] == [{"term": {"tags": "erp"}}]


def test_opensearch_creates_index_only_when_missing():
    client = MagicMock()
    client.indices.exists.return_value = True
    OpenSearchSearch(client, "catalog-items").ensure_index()
    client.indices.create.assert_not_called()


@pytest.mark.skipif(not os.getenv("OPENSEARCH_INTEGRATION"), reason="set OPENSEARCH_INTEGRATION=1 with OpenSearch running")
def test_opensearch_round_trip():
    from opensearchpy import OpenSearch

    url = os.getenv("CATALOG_OPENSEARCH_URL", "http://localhost:9200")
    backend = OpenSearchSearch(OpenSearch(hosts=[url]), "catalog-items-test")
    backend.client.indices.delete(index="catalog-items-test", ignore=[404])
    backend.ensure_index()
    backend.index(_item(1, "Sales orders", ["erp"]))
    backend.index(_item(2, "Payroll", ["hr"]))
    assert backend.search("sales") == [1]
    assert backend.search("sales", tag="hr") == []
