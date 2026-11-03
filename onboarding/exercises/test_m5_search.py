"""Module 5 checks. Run: pytest exercises/test_m5_search.py"""

from datetime import UTC, datetime

from catalog.models import Item
from catalog.search import InMemorySearch


def _item(item_id: int, name: str, tags: list[str]) -> Item:
    return Item(id=item_id, name=name, kind="dataset", owner="o", tags=tags, created_at=datetime.now(UTC))


def test_in_memory_filters_by_tag():
    s = InMemorySearch()
    s.index(_item(1, "Sales orders", ["erp"]))
    s.index(_item(2, "Sales targets", ["planning"]))
    assert s.search("sales", tag="erp") == [1]
    assert s.search("sales", tag="ERP") == [1]
    assert s.search("sales", tag="missing") == []


def test_tag_filter_does_not_change_ranking():
    s = InMemorySearch()
    s.index(_item(1, "Sales", ["erp"]))
    s.index(_item(2, "Sales orders by region", ["erp"]))
    assert s.search("sales region", tag="erp") == [2, 1]


def test_search_endpoint_with_tag(client):
    client.post("/items", json={"name": "Sales orders", "kind": "dataset", "owner": "o", "tags": ["erp"]})
    client.post("/items", json={"name": "Sales targets", "kind": "dataset", "owner": "o", "tags": ["planning"]})
    names = [i["name"] for i in client.get("/search", params={"q": "sales", "tag": "planning"}).json()]
    assert names == ["Sales targets"]
