from datetime import UTC, datetime

from catalog.models import Item
from catalog.transforms import to_search_doc


def test_search_doc_drops_metadata_and_timestamp():
    item = Item(
        id=1, name="A", kind="dataset", owner="o", description="d",
        tags=["x"], metadata={"secret": True}, created_at=datetime.now(UTC),
    )
    assert to_search_doc(item) == {
        "id": 1, "name": "A", "kind": "dataset", "owner": "o", "description": "d", "tags": ["x"],
    }
