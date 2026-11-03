# Module 5: Search with OpenSearch

**Goal:** index documents, write queries, filter results, and test search code without a running cluster. Enterprise Search and a catalog's discovery features work this way.

OpenSearch is a fork of Elasticsearch 7.10. The query language and the Python clients (`opensearch-py`, `elasticsearch`) are nearly the same, so what you learn here carries over.

## Learn

- An **index** holds documents (JSON). Each has an `_id`. The database stays the source of truth; the index is a copy built for searching.
- A **mapping** sets each field's type. `text` is split into words for full-text search; `keyword` is matched exactly (tags, ids, owners). Getting this wrong is the most common search bug. [Mappings](https://opensearch.org/docs/latest/field-types/)
- The **query DSL** is JSON. `bool` combines clauses: `must` affects matching and score, `filter` affects matching only and is cached. `multi_match` searches several fields; `name^2` weights a field double. `term` matches a keyword exactly. [Query DSL](https://opensearch.org/docs/latest/query-dsl/)
- A new document is searchable after a **refresh** (about once a second by default). `refresh=True` forces it; fine for tests, slow for bulk loads.
- Hide the client behind your own interface (`SearchBackend` here) so the rest of the code doesn't depend on it, and tests can use a fake.
- [opensearch-py user guide](https://opensearch.org/docs/latest/clients/python-low-level/)

## Read

Open `catalog/search.py` and `tests/test_search.py`.

1. Why is `tags` a `keyword` and `description` a `text`?
2. In `OpenSearchSearch.search`, why is the tag in `filter` instead of `must`?
3. `CatalogService.search` gets ids from search, then loads items from the database. Why not return the search documents directly?
4. What happens to a newly registered item if OpenSearch is down? Find the code and the test.

## Do

**1. Tag filter in `InMemorySearch`.** Remove the `NotImplementedError` and make `search(text, tag=...)` return only items carrying that tag (case-insensitive). Like OpenSearch's `filter`, it must not change the ranking.

**2. Run the real thing (needs Docker).**

```bash
docker compose up -d opensearch
OPENSEARCH_INTEGRATION=1 pytest tests/test_search.py
CATALOG_SEARCH_BACKEND=opensearch uvicorn catalog.api:create_app --factory --reload
```

Register a few items in `/docs`, then query OpenSearch directly:

```bash
curl -s "localhost:9200/catalog-items/_search?q=sales&pretty"
```

```bash
curl -s "localhost:9200/catalog-items/_mapping?pretty"
```

**3. Explain a score.** Ask OpenSearch why each hit scored as it did:

```bash
curl -s -H 'content-type: application/json' "localhost:9200/catalog-items/_search?pretty" -d '{"explain": true, "query": {"multi_match": {"query": "sales", "fields": ["name^2", "description"]}}}'
```

Find where the `^2` weight on `name` shows up in `_explanation`.

## Done when

```bash
pytest exercises/test_m5_search.py
pytest
```

Both pass, and you've seen your items come back from a real OpenSearch query.

## Check yourself

- A user searches for tag `Sales` and gets nothing, though items are tagged `sales`. Name two places the bug could be.
- The index and the database disagree after an outage. How would you rebuild the index?
- When would you choose a `match` query over a `term` query?
