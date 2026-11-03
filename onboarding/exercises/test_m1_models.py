"""Module 1 checks. Run: pytest exercises/test_m1_models.py"""

from pathlib import Path

import pytest
from pydantic import ValidationError

from catalog.models import ItemCreate
from catalog.transforms import flatten_metadata, load_legacy_export

FIXTURE = Path(__file__).parent.parent / "fixtures" / "legacy_export.json"


def test_flatten_nested():
    assert flatten_metadata({"source": {"system": "erp", "id": 7}, "rows": 10}) == {
        "source.system": "erp",
        "source.id": 7,
        "rows": 10,
    }


def test_flatten_deep_and_keeps_lists():
    assert flatten_metadata({"a": {"b": {"c": [1, 2]}}}) == {"a.b.c": [1, 2]}


def test_flatten_empty():
    assert flatten_metadata({}) == {}


def test_metadata_keys_must_be_snake_case():
    ItemCreate(name="x", kind="dataset", owner="o", metadata={"row_count": 1, "v2": True})
    with pytest.raises(ValidationError) as exc_info:
        ItemCreate(name="x", kind="dataset", owner="o", metadata={"rowCount": 1})
    assert exc_info.value.errors()[0]["loc"][0] == "metadata"
    assert "rowCount" in str(exc_info.value)


def test_load_legacy_export():
    items, errors = load_legacy_export(FIXTURE)
    assert [i.name for i in items] == ["Sales orders", "Billing API", "Onboarding guide", "Payroll"]
    assert [i.kind for i in items] == ["dataset", "service", "document", "dataset"]
    assert items[0].tags == ["sales", "erp"]
    assert items[0].metadata["source"] == {"system": "erp", "table": "orders"}
    assert items[1].description == ""
    assert items[2].tags == []
    assert items[3].tags == ["hr", "payroll"]
    assert len(errors) == 2
    assert errors[0].startswith("2:")
    assert errors[1].startswith("4:")
