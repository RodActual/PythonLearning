import pytest
from pydantic import ValidationError

from catalog.models import Item, ItemCreate


def test_tags_are_normalized(make_item):
    item = make_item(tags=["  Sales", "sales", "ERP "])
    assert item.tags == ["erp", "sales"]


@pytest.mark.parametrize(
    "overrides, field",
    [
        ({"name": "   "}, "name"),
        ({"kind": "spreadsheet"}, "kind"),
        ({"tags": ["ok", " "]}, "tags"),
        ({"tags": ["x" * 51]}, "tags"),
    ],
)
def test_invalid_input_names_the_field(make_item, overrides, field):
    with pytest.raises(ValidationError) as exc_info:
        make_item(**overrides)
    assert exc_info.value.errors()[0]["loc"][0] == field


def test_parses_from_json():
    raw = '{"name": "Billing API", "kind": "service", "owner": "payments", "tags": ["Billing"]}'
    item = ItemCreate.model_validate_json(raw)
    assert item.tags == ["billing"]
    assert item.metadata == {}


def test_dumps_to_json_round_trip(make_item):
    item = make_item()
    assert ItemCreate.model_validate_json(item.model_dump_json()) == item


def test_docs_example_is_valid():
    # The /docs page pre-fills this example, so it must pass every rule, including Lesson 1's.
    import re

    from catalog.models import EXAMPLE_ITEM

    item = ItemCreate(**EXAMPLE_ITEM)
    assert all(re.fullmatch(r"[a-z][a-z0-9_]*", key) for key in item.metadata)
    assert ItemCreate.model_json_schema()["examples"] == [EXAMPLE_ITEM]
    assert "examples" not in Item.model_json_schema()
