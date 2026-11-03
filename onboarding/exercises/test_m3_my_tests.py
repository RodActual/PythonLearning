"""Module 3: you write these tests. Replace each pytest.fail with a real test.

Done when every test passes AND each one fails when you break the code it covers
(see modules/03-testing.md for what to break).
"""

import pytest


@pytest.fixture
def three_items(client):
    """Register three items through the API and return their ids."""
    pytest.fail("TODO: post three items and return [id, id, id]")


def test_list_returns_registered_items(client, three_items):
    pytest.fail("TODO: GET /items and check it returns exactly the three ids")


# TODO: parametrize this over at least three bad query strings for /search
# (empty q, limit=0, limit=51) and assert each returns 422.
def test_search_rejects_bad_params(client):
    pytest.fail("TODO")


def test_opensearch_remove_ignores_missing_documents():
    # Use MagicMock for the client. Assert delete was called with the right
    # index, id as a string, and ignore=[404].
    pytest.fail("TODO")


def test_service_delete_logs(repo, make_item, caplog):
    # Build a CatalogService with a MagicMock search backend, delete an item,
    # and assert the log says "deleted item <id>" and search.remove was called.
    pytest.fail("TODO")
