"""Turn models into other shapes: search documents, and data from older systems."""

from pathlib import Path
from typing import Any

from catalog.models import Item, ItemCreate


def to_search_doc(item: Item) -> dict[str, Any]:
    """The document stored in the search index for one item."""
    return {
        "id": item.id,
        "name": item.name,
        "kind": item.kind,
        "owner": item.owner,
        "description": item.description,
        "tags": item.tags,
    }


def flatten_metadata(metadata: dict[str, Any], prefix: str = "") -> dict[str, Any]:
    """Module 1 exercise: flatten nested dicts into dotted keys.

    {"source": {"system": "erp", "id": 7}, "rows": 10}
    -> {"source.system": "erp", "source.id": 7, "rows": 10}

    Lists and other values are kept as they are.
    """
    raise NotImplementedError("Module 1 exercise")


def load_legacy_export(path: Path) -> tuple[list[ItemCreate], list[str]]:
    """Module 1 exercise: read fixtures/legacy_export.json into ItemCreate models.

    Return (items, errors). Skip any record that fails validation and add one
    message per skipped record to errors, starting with its index, e.g. "2: ...".
    See modules/01-data-modeling.md for the field mapping.
    """
    raise NotImplementedError("Module 1 exercise")
