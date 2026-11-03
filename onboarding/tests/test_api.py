PAYLOAD = {
    "name": "Sales orders",
    "kind": "dataset",
    "owner": "data-team",
    "description": "Daily sales orders",
    "tags": ["Sales", "ERP"],
    "metadata": {"rows": 1200},
}


def test_health(client):
    assert client.get("/health").json() == {"status": "ok"}


def test_register_then_get(client):
    created = client.post("/items", json=PAYLOAD)
    assert created.status_code == 201
    body = created.json()
    assert body["tags"] == ["erp", "sales"]

    fetched = client.get(f"/items/{body['id']}")
    assert fetched.status_code == 200
    assert fetched.json() == body


def test_validation_error_is_422(client):
    resp = client.post("/items", json={**PAYLOAD, "kind": "spreadsheet"})
    assert resp.status_code == 422
    assert "kind" in resp.text  # the body's shape changes in the Module 2 exercise


def test_duplicate_is_409(client):
    client.post("/items", json=PAYLOAD)
    resp = client.post("/items", json=PAYLOAD)
    assert resp.status_code == 409
    assert "already exists" in resp.json()["detail"]


def test_missing_item_is_404(client):
    resp = client.get("/items/999")
    assert resp.status_code == 404
    assert resp.json() == {"detail": "item 999 not found"}


def test_list_limit_is_validated(client):
    assert client.get("/items", params={"limit": 0}).status_code == 422
    assert client.get("/items", params={"limit": 101}).status_code == 422


def test_search(client):
    client.post("/items", json=PAYLOAD)
    client.post("/items", json={**PAYLOAD, "name": "Payroll", "description": "Monthly payroll", "tags": ["hr"]})
    names = [i["name"] for i in client.get("/search", params={"q": "payroll"}).json()]
    assert names == ["Payroll"]


def test_openapi_spec_lists_routes(client):
    paths = client.get("/openapi.json").json()["paths"]
    assert {"/items", "/items/{item_id}", "/search"} <= paths.keys()


def test_unsolved_exercise_is_501(client):
    resp = client.get("/search", params={"q": "sales", "tag": "erp"})
    assert resp.status_code == 501
    assert "Module 5" in resp.json()["detail"]
