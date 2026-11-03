# Lesson 3: Testing with pytest

**What you'll be able to do:** write your own checks that prove code works, reuse setup between checks, and replace slow or unreliable parts (like a search server) with stand-ins.

**Time:** about 1 day.

**Before you start:** open a terminal in the onboarding folder with the workspace on ([README, Part 2](../README.md#part-2-every-time-you-come-back)), and open the folder in VS Code.

---

## 1. The ideas, in plain words

### A test is a small program that checks another program

So far you've run checks other people wrote. In this lesson you write them. A test is a function whose name starts with `test_`. It runs some code and uses `assert` to say what must be true:

```python
def test_tags_are_lowercased(make_item):
    item = make_item(tags=["Sales"])
    assert item.tags == ["sales"]
```

`pytest` finds every function named `test_...` in files named `test_....py` and runs them. If an `assert` is false, pytest shows you both values so you can see the difference.

In a job that's mostly fixing and maintaining existing software, tests are how you fix one bug without quietly causing two others.

### Fixtures are shared setup

Many tests need the same things ready first: a fresh database, a running copy of the app. A **fixture** is a function that prepares one of those things. A test asks for it by putting its name in the brackets after the test's name, like `make_item` above.

This project's shared fixtures are in `conftest.py` (pytest loads that file automatically):

| Fixture | What it gives your test |
|---|---|
| `client` | A copy of the app you can send requests to, with an empty database |
| `repo` | Direct access to an empty database |
| `make_item` | A function that builds a valid item; pass only the fields you want to change |
| `search` | The stand-in search engine the `client` uses |

You can write your own fixtures with `@pytest.fixture` above a function.

### One test, many inputs

`@pytest.mark.parametrize` runs one test several times with different values, and reports each run separately:

```python
@pytest.mark.parametrize("kind", ["spreadsheet", "", "DATASET"])
def test_bad_kind_rejected(make_item, kind):
    with pytest.raises(ValidationError):
        make_item(kind=kind)
```

`with pytest.raises(SomeError):` means "the code inside must raise this error".

### Stand-ins: mocks

Some parts are slow or out of your control, like a search server on another machine. A **mock** is a fake object that accepts any call, remembers it, and returns whatever you tell it to. Python's `MagicMock` does this:

```python
search = MagicMock()
search.search.return_value = [3, 1]           # pretend the search found items 3 and 1
search.index.side_effect = ConnectionError()  # pretend the server is down
...
search.remove.assert_called_once_with(5)      # check it was asked to remove item 5
```

Use mocks for things outside your program. Don't mock the code you're testing.

### Two more built-in fixtures

- `caplog` captures log messages, so you can check one was written: `assert "deleted item 1" in caplog.text`.
- `monkeypatch` changes something for one test only and puts it back afterwards (for example, an environment setting).

### Want more?

- [pytest: getting started](https://docs.pytest.org/en/stable/getting-started.html)
- [pytest: fixtures](https://docs.pytest.org/en/stable/how-to/fixtures.html)
- [unittest.mock](https://docs.python.org/3/library/unittest.mock.html)

---

## 2. Look around the code

Open `conftest.py`, then `tests/test_service.py`, then `tests/test_search.py`.

**a. Why does every test start with an empty database?**

<details><summary>Answer</summary>

The `settings` fixture uses the database address `sqlite://`, which means "a new database in memory". Each test gets new fixtures, so each gets its own empty database that disappears afterwards.
</details>

**b. `test_register_survives_search_outage` uses `side_effect`. What is it checking?**

<details><summary>Answer</summary>

`side_effect = ConnectionError(...)` makes the fake search raise an error, like a server that's down. The test checks that the item is still saved and that the failure is written to the log.
</details>

**c. `test_opensearch_builds_query_with_tag_filter` never talks to a real search server. What does it prove, and what can't it prove?**

<details><summary>Answer</summary>

It proves our code builds the right request and reads the reply correctly. It can't prove a real server accepts that request; that's what the skipped integration test in the same file is for (you'll run it in lesson 5).
</details>

**d. Try these and see what changes:**

```bash
pytest -v
```

```bash
pytest -k search
```

```bash
pytest -x
```

<details><summary>Answer</summary>

`-v` lists every test by name. `-k search` runs only tests with "search" in their name. `-x` stops at the first failure.
</details>

---

## 3. Exercises

This time there's no code to fix: you write the tests. Open `exercises/test_m3_my_tests.py`. Each test contains `pytest.fail("TODO")`; replace that with a real test.

Run:

```bash
pytest exercises/test_m3_my_tests.py
```

Everything fails or errors at first. That's expected.

### Exercise 1: A fixture and a test that uses it

**Goal:** `three_items` adds three items through the API and returns their ids. `test_list_returns_registered_items` checks that `GET /items` returns exactly those ids, in that order.

**Steps:**

1. In `three_items`, replace `pytest.fail(...)` with code that sends `client.post("/items", json={...})` three times with different names, collects each reply's `id`, and returns the list.
2. In `test_list_returns_registered_items`, replace `pytest.fail(...)` with code that calls `client.get("/items")` and asserts the ids match `three_items`.

<details><summary>Hint</summary>

A valid item needs at least `{"name": "First", "kind": "dataset", "owner": "me"}`. `response.json()` turns a reply into Python. `[item["id"] for item in listed]` makes a list of just the ids.
</details>

<details><summary>Show the answer</summary>

```python
@pytest.fixture
def three_items(client):
    """Register three items through the API and return their ids."""
    ids = []
    for name in ["First", "Second", "Third"]:
        response = client.post("/items", json={"name": name, "kind": "dataset", "owner": "me"})
        ids.append(response.json()["id"])
    return ids


def test_list_returns_registered_items(client, three_items):
    listed = client.get("/items").json()
    assert [item["id"] for item in listed] == three_items
```
</details>

### Exercise 2: One test, three bad inputs

**Goal:** check that `/search` replies 422 for an empty search (`q=""`), a `limit` of 0, and a `limit` of 51.

**Steps:**

1. Add `@pytest.mark.parametrize("params", [...])` above `test_search_rejects_bad_params`, listing three dictionaries of request settings.
2. Add `params` to the test's brackets, next to `client`.
3. Replace `pytest.fail(...)` with: send `client.get("/search", params=params)` and assert the status code is 422.

<details><summary>Show the answer</summary>

```python
@pytest.mark.parametrize("params", [{"q": ""}, {"q": "sales", "limit": 0}, {"q": "sales", "limit": 51}])
def test_search_rejects_bad_params(client, params):
    assert client.get("/search", params=params).status_code == 422
```
</details>

### Exercise 3: A mock

**Goal:** check that `OpenSearchSearch.remove(5)` asks the search server to delete document `"5"` and to ignore "not found" (code 404).

**Steps:**

1. At the top of the file, add `from unittest.mock import MagicMock` and `from catalog.search import OpenSearchSearch`.
2. In the test, make a fake client with `MagicMock()`, build `OpenSearchSearch(fake_client, "catalog-items")`, and call `.remove(5)` on it.
3. Assert the fake client's `delete` was called once with `index="catalog-items"`, `id="5"`, `refresh=True` and `ignore=[404]`.

<details><summary>Show the answer</summary>

```python
def test_opensearch_remove_ignores_missing_documents():
    fake_client = MagicMock()
    OpenSearchSearch(fake_client, "catalog-items").remove(5)
    fake_client.delete.assert_called_once_with(index="catalog-items", id="5", refresh=True, ignore=[404])
```
</details>

### Exercise 4: Check a log message

**Goal:** check that deleting an item writes `deleted item <id>` to the log and asks search to remove it.

**Steps:**

1. At the top of the file, add `import logging` and `from catalog.service import CatalogService`.
2. In the test, add an item with `repo.add(make_item())`, make a fake search with `MagicMock()`, and build `CatalogService(repo, search)`.
3. Delete the item inside `with caplog.at_level(logging.INFO):` so info-level messages are captured.
4. Assert the message is in `caplog.text` and that `search.remove` was called once with the item's id.

<details><summary>Show the answer</summary>

```python
def test_service_delete_logs(repo, make_item, caplog):
    item = repo.add(make_item())
    search = MagicMock()
    with caplog.at_level(logging.INFO):
        CatalogService(repo, search).delete(item.id)
    assert f"deleted item {item.id}" in caplog.text
    search.remove.assert_called_once_with(item.id)
```

With all four answers, the top of the file reads:

```python
import logging
from unittest.mock import MagicMock

import pytest

from catalog.search import OpenSearchSearch
from catalog.service import CatalogService
```
</details>

---

## 4. Finished?

```bash
pytest exercises/test_m3_my_tests.py
```

It should show `6 passed` (Exercise 2 counts as three).

**Now prove your tests actually catch bugs.** A test that still passes when the code is broken isn't checking anything. For each row below: make the change, run the command above, confirm that test now **fails**, then undo the change (**Ctrl + Z**, or **Command + Z** on a Mac) and save.

| Your test | Break this | Where |
|---|---|---|
| Exercise 1 | Change `order_by(ItemRow.id)` to `order_by(ItemRow.id.desc())` | `catalog/repository.py`, in `list_items` |
| Exercise 2 | In `search_items`, change `le=50` to `le=100` | `catalog/api.py` |
| Exercise 3 | Delete `, ignore=[404]` | `catalog/search.py`, in `OpenSearchSearch.remove` |
| Exercise 4 | Delete the line `log.info("deleted item %s", item_id)` | `catalog/service.py`, in `delete` |

When you're done, run `pytest` to make sure everything is back: `38 passed, 1 skipped`.

---

## 5. Check yourself

**a. When is a mock the wrong choice?**

<details><summary>Answer</summary>

When you mock the very code you're testing, or when the real thing is fast and reliable (like the in-memory database here). Then the test only proves the mock works.
</details>

**b. You're fixing a bug. Should you write the test before or after the fix?**

<details><summary>Answer</summary>

Before. Write a test that fails because of the bug, then fix the code and watch it pass. That proves the test catches the bug and that your fix works.
</details>

**c. In a fixture that uses `yield`, what runs before the `yield` and what runs after?**

<details><summary>Answer</summary>

Before: the setup, and `yield` hands the result to the test. After: the cleanup, which runs once the test finishes, even if it failed.
</details>
