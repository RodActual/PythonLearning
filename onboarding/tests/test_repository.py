import pytest

from catalog.repository import DuplicateItemError


def test_add_and_get(repo, make_item):
    created = repo.add(make_item())
    fetched = repo.get(created.id)
    assert fetched is not None
    assert fetched.name == "Sales orders"
    assert fetched.tags == ["erp", "sales"]
    assert fetched.metadata == {"rows": 1200}


def test_tags_are_shared_between_items(repo, make_item, session):
    from sqlalchemy import func, select

    from catalog.db import TagRow

    repo.add(make_item(name="A", tags=["sales"]))
    repo.add(make_item(name="B", tags=["sales", "hr"]))
    assert session.scalar(select(func.count()).select_from(TagRow)) == 2


def test_duplicate_name_raises(repo, make_item):
    repo.add(make_item())
    with pytest.raises(DuplicateItemError):
        repo.add(make_item())


def test_list_filters_by_tag_and_paginates(repo, make_item):
    for i in range(5):
        repo.add(make_item(name=f"item {i}", tags=["even" if i % 2 == 0 else "odd"]))
    assert [i.name for i in repo.list_items(tag="even")] == ["item 0", "item 2", "item 4"]
    assert [i.name for i in repo.list_items(limit=2, offset=2)] == ["item 2", "item 3"]


def test_delete(repo, make_item):
    item = repo.add(make_item())
    assert repo.delete(item.id) is True
    assert repo.get(item.id) is None
    assert repo.delete(item.id) is False
