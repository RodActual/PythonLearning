import pytest
from pydantic import ValidationError

from catalog.models import ItemCreate


def test_tags_are_normalized(make_item):
    item = make_item(tags=["  Sales", "sales", "ERP "])
    assert item.tags == ["sales", "erp"]


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
