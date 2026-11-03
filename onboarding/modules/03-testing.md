# Module 3: Testing with pytest

**Goal:** write tests that are short, isolated and trustworthy. In a sustainment role, tests are how you fix a bug without breaking two others.

## Learn

- pytest finds files named `test_*.py` and functions named `test_*`, and runs them. A plain `assert` is enough; pytest shows the values on failure. [Getting started](https://docs.pytest.org/en/stable/getting-started.html)
- A **fixture** is setup you request by naming it as an argument. `conftest.py` fixtures are shared by every test below it. A fixture that `yield`s runs its cleanup after the test. [Fixtures](https://docs.pytest.org/en/stable/how-to/fixtures.html)
- A **factory fixture** returns a function, so each test builds exactly the data it needs (`make_item` here).
- `@pytest.mark.parametrize` runs one test over many inputs, each reported separately.
- `pytest.raises(SomeError)` asserts that code raises.
- **Mocking** replaces a collaborator with a fake you control and inspect. `MagicMock()` accepts any call and records it; set `.return_value` or `.side_effect`; check with `assert_called_once_with`. Mock at boundaries (network, search, clock), not your own logic. [unittest.mock](https://docs.python.org/3/library/unittest.mock.html)
- Built-in fixtures: `monkeypatch` sets env vars or attributes for one test; `caplog` captures log output; `tmp_path` gives a fresh folder.
- **Integration tests** hit a real dependency. Mark or skip them so the fast suite runs anywhere (see the last test in `tests/test_search.py`).

## Read

Open `conftest.py`, `tests/test_service.py` and `tests/test_search.py`.

1. Why does every test get a fresh database? Which fixture makes that true?
2. `test_register_survives_search_outage` uses `side_effect`. What would the test prove if it used `return_value` instead?
3. `test_opensearch_builds_query_with_tag_filter` never talks to OpenSearch. What does it prove, and what can't it prove?
4. Run `pytest -x -vv` and then `pytest -k search`. What do `-x`, `-vv` and `-k` do?

## Do

Open `exercises/test_m3_my_tests.py` and replace every `pytest.fail("TODO")` with a real test:

1. `three_items` fixture plus a test that `GET /items` returns exactly those ids, in order.
2. Parametrize `test_search_rejects_bad_params` over `q=""`, `limit=0` and `limit=51`.
3. With a `MagicMock` client, test that `OpenSearchSearch.remove(5)` calls `delete(index=..., id="5", refresh=True, ignore=[404])`.
4. Test that `CatalogService.delete` logs `deleted item <id>` and calls `search.remove`.

## Done when

All four pass, and each one **fails** when you break the code it covers. Try each break, run the test, then undo it:

| Test | Break this |
|---|---|
| 1 | In `repository.py`, change `order_by(ItemRow.id)` to `order_by(ItemRow.id.desc())` |
| 2 | In `api.py`, change `/search`'s `le=50` to `le=100` |
| 3 | In `search.py`, remove `ignore=[404]` |
| 4 | In `service.py`, delete the `log.info("deleted item ...")` line |

A test that still passes after its break isn't testing anything.

## Check yourself

- When is a mock the wrong choice?
- Your fix needs a test. Should you write it before or after the fix, and why?
- What's the difference between a fixture's return value and its cleanup, and where does cleanup go?
