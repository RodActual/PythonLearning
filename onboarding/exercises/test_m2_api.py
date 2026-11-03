"""Module 2 checks. Run: pytest exercises/test_m2_api.py"""

PAYLOAD = {"name": "Sales orders", "kind": "dataset", "owner": "data-team", "tags": ["sales"]}


def test_delete_item(client):
    item_id = client.post("/items", json=PAYLOAD).json()["id"]

    resp = client.delete(f"/items/{item_id}")
    assert resp.status_code == 204
    assert resp.content == b""

    assert client.get(f"/items/{item_id}").status_code == 404
    assert client.get("/search", params={"q": "sales"}).json() == []


def test_delete_missing_item_is_404(client):
    resp = client.delete("/items/42")
    assert resp.status_code == 404
    assert resp.json() == {"detail": "item 42 not found"}


def test_validation_errors_use_flat_shape(client):
    resp = client.post("/items", json={**PAYLOAD, "kind": "spreadsheet", "tags": ["ok", " "]})
    assert resp.status_code == 422
    errors = resp.json()["errors"]
    assert {e["field"] for e in errors} == {"kind", "tags"}
    assert all(isinstance(e["message"], str) and e["message"] for e in errors)


def test_query_param_errors_use_flat_shape(client):
    resp = client.get("/items", params={"limit": 0})
    assert resp.status_code == 422
    assert resp.json()["errors"][0]["field"] == "limit"


def test_openapi_documents_delete(client):
    spec = client.get("/openapi.json").json()
    assert "delete" in spec["paths"]["/items/{item_id}"]
