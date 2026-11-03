"""Module 4 checks. Run: pytest exercises/test_m4_database.py"""


def test_count_by_tag(repo, make_item):
    repo.add(make_item(name="A", tags=["sales", "erp"]))
    repo.add(make_item(name="B", tags=["sales"]))
    repo.add(make_item(name="C", tags=[]))
    assert repo.count_by_tag() == {"erp": 1, "sales": 2}


def test_count_by_tag_skips_unused_tags(repo, make_item):
    item = repo.add(make_item(name="A", tags=["old"]))
    repo.delete(item.id)
    assert repo.count_by_tag() == {}


def test_count_by_tag_uses_one_query(repo, make_item, session):
    from sqlalchemy import event

    for i in range(5):
        repo.add(make_item(name=f"item {i}", tags=["a", "b"]))
    statements = []
    listener = lambda *args: statements.append(args[2])  # noqa: E731
    event.listen(session.bind, "before_cursor_execute", listener)
    try:
        repo.count_by_tag()
    finally:
        event.remove(session.bind, "before_cursor_execute", listener)
    assert len(statements) == 1
    assert "GROUP BY" in statements[0].upper()


def test_tags_endpoint(client):
    client.post("/items", json={"name": "A", "kind": "dataset", "owner": "o", "tags": ["sales", "erp"]})
    client.post("/items", json={"name": "B", "kind": "dataset", "owner": "o", "tags": ["sales"]})
    resp = client.get("/tags")
    assert resp.status_code == 200
    assert resp.json() == {"erp": 1, "sales": 2}


def test_list_filters_by_owner(client):
    client.post("/items", json={"name": "A", "kind": "dataset", "owner": "data-team"})
    client.post("/items", json={"name": "B", "kind": "dataset", "owner": "hr-team"})
    names = [i["name"] for i in client.get("/items", params={"owner": "hr-team"}).json()]
    assert names == ["B"]
