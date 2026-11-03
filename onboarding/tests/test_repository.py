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


def test_get_many_keeps_order_and_skips_missing(repo, make_item):
    a = repo.add(make_item(name="A"))
    b = repo.add(make_item(name="B"))
    assert [i.name for i in repo.get_many([b.id, 999, a.id])] == ["B", "A"]


def test_tag_race_is_retried(repo, make_item, monkeypatch):
    from catalog.db import TagRow

    repo.add(make_item(name="A", tags=["sales"]))

    # First lookup misses the tag, as if another request inserted it in the meantime.
    real_lookup = repo._get_or_create_tags
    calls = []

    def racy_lookup(names):
        calls.append(names)
        return [TagRow(name=n) for n in names] if len(calls) == 1 else real_lookup(names)

    monkeypatch.setattr(repo, "_get_or_create_tags", racy_lookup)
    item = repo.add(make_item(name="B", tags=["sales"]))
    assert item.tags == ["sales"]
    assert len(calls) == 2


def test_created_at_loads_timezone_aware(repo, make_item, session):
    from sqlalchemy import select

    from catalog.db import ItemRow

    repo.add(make_item())
    session.expire_all()
    assert session.scalar(select(ItemRow.created_at)).tzinfo is not None
