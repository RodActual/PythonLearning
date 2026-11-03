# Lesson 5: Search with OpenSearch

**What you'll be able to do:** explain how a search engine stores and finds documents, write a search request, and filter results.

**Time:** about 1.5 days.

**Before you start:**

1. Open a terminal in the onboarding folder with the workspace on ([README, Part 2](../README.md#part-2-every-time-you-come-back)), and open the folder in VS Code.
2. Install and open Docker Desktop ([README, Part 3](../README.md#lessons-5-and-7-install-docker-desktop)). You need it for section 4.

---

## 1. The ideas, in plain words

### Why a search engine, when we have a database?

A database is great at exact questions: "items owned by hr-team". It's poor at fuzzy ones: "anything about sales orders", ranked so the best match comes first. A **search engine** is built for those. This project uses **OpenSearch**, a free search engine. (It started as a copy of another one called Elasticsearch, so almost everything here also applies to Elasticsearch.)

The database stays the official record. The search engine keeps a copy of each item arranged for fast searching. When an item is added or removed, the service updates both.

### Index, document, mapping

| Word | Meaning |
|---|---|
| **Index** | The search engine's equivalent of a table: a named collection, here `catalog-items` |
| **Document** | One stored record, as JSON, with an id |
| **Mapping** | The rules for each field of a document |

The mapping matters most. Two field types:

- **`text`**: split into words, so a search for `orders` finds "Daily sales orders". Used for `name` and `description`.
- **`keyword`**: kept whole and matched exactly. `sales` matches `sales`, but not `Sales` or `sales team`. Used for `tags`, `kind` and `owner`.

Picking the wrong type is the most common search bug.

### A search request is JSON

You ask OpenSearch questions in JSON. Our service sends one like this:

```json
{
  "query": {
    "bool": {
      "must":   [{"multi_match": {"query": "sales", "fields": ["name^2", "description", "tags"]}}],
      "filter": [{"term": {"tags": "erp"}}]
    }
  }
}
```

Reading it:

- `must`: documents must match the words, and the better they match, the higher they rank.
- `multi_match`: look for the words in several fields. `name^2` means a match in the name counts twice as much.
- `filter`: documents must also have the tag `erp`, but this doesn't change their rank.
- `term`: exact match, for keyword fields.

### Testing without a server

Tests shouldn't need a real search server running. So the code defines what a search backend must do (`index`, `remove`, `search`) and has two versions:

- `OpenSearchSearch` talks to a real OpenSearch.
- `InMemorySearch` is a tiny stand-in that keeps documents in memory and ranks by how many search words they contain.

Tests and local runs use the stand-in. In this lesson you'll make the stand-in support tag filters, then run the real thing.

### Want more?

- [OpenSearch field types](https://opensearch.org/docs/latest/field-types/)
- [OpenSearch query language](https://opensearch.org/docs/latest/query-dsl/)

---

## 2. Look around the code

Open `catalog/search.py`.

**a. Find `INDEX_MAPPING`. Why is `tags` a `keyword` but `description` a `text`?**

<details><summary>Answer</summary>

Tags are labels you match exactly (`erp` should never match `erp-legacy`). A description is free text you search word by word.
</details>

**b. In `OpenSearchSearch.search`, why is the tag in `filter` and not in `must`?**

<details><summary>Answer</summary>

The tag is a yes/no condition. It shouldn't make one result rank higher than another; only the words should. `filter` matches without scoring, and OpenSearch can also reuse its result, which is faster.
</details>

**c. Open `catalog/service.py` and find `search`. It gets ids from the search engine, then loads the items from the database. Why not return what the search engine has?**

<details><summary>Answer</summary>

The database is the official record. The search copy can be out of date, for example after a failed update, so the service loads current data from the database and skips anything that no longer exists there.
</details>

**d. What happens to a new item if the search engine is down?**

<details><summary>Answer</summary>

`CatalogService.register` saves it to the database, then catches the search error and writes it to the log instead of failing the request. The test `test_register_survives_search_outage` in `tests/test_service.py` checks this.
</details>

---

## 3. Exercise: filter by tag in the stand-in

Run:

```bash
pytest exercises/test_m5_search.py
```

All 3 checks fail at first. That's expected. (If you try `/search` with a tag on the docs page now, you'll get code 501, "not built yet".)

**Goal:** `InMemorySearch.search("sales", tag="erp")` returns only items that have the tag `erp`. Capital letters in the tag don't matter, and the order of results stays the same as without the filter.

**Where:** `catalog/search.py`, the `search` method of `class InMemorySearch`.

**Steps:**

1. Delete these two lines at the start of the method:

   ```python
           if tag is not None:
               raise NotImplementedError("Module 5 exercise: filter by tag")
   ```

2. Inside the `for item_id, doc in self.docs.items():` loop, before the line that starts `words = `, add a check: if a tag was given and the document's tags don't include it (lowercased), skip this document with `continue`.
3. Save and run the checks.

<details><summary>Show the answer</summary>

The whole method, after the change:

```python
    def search(self, text: str, tag: str | None = None, limit: int = 10) -> list[int]:
        query = _tokens(text)
        scored = []
        for item_id, doc in self.docs.items():
            if tag is not None and tag.lower() not in doc["tags"]:
                continue
            words = _tokens(f"{doc['name']} {doc['description']} {' '.join(doc['tags'])}")
            score = len(query & words)
            if score:
                scored.append((-score, item_id))
        return [item_id for _, item_id in sorted(scored)[:limit]]
```
</details>

---

## 4. Run the real search engine

This part needs Docker Desktop open.

**Step 1.** Start OpenSearch. The first time, it downloads about 1 GB, which takes a few minutes.

```bash
docker compose up -d opensearch
```

When it finishes, you're back at the prompt. OpenSearch takes another 30 seconds or so to be ready.

**Step 2.** Run the test that talks to the real engine.

**Mac:**

```bash
OPENSEARCH_INTEGRATION=1 pytest tests/test_search.py
```

**Windows:**

```powershell
$env:OPENSEARCH_INTEGRATION=1; pytest tests/test_search.py
```

You should see `5 passed` with nothing skipped.

- If you get a connection error, OpenSearch isn't ready yet. Wait 30 seconds and try again.
- If a check fails for another reason, run `docker compose logs opensearch` and look near the end for lines containing `ERROR`. Copy the failing check's message and that log when asking for help.

On Windows, switch the setting off again straight away, so later `pytest` runs in this window don't try to reach OpenSearch:

```powershell
Remove-Item Env:OPENSEARCH_INTEGRATION
```

**Step 3.** Start the service using the real engine.

**Mac:**

```bash
CATALOG_SEARCH_BACKEND=opensearch uvicorn catalog.api:create_app --factory --reload
```

**Windows:**

```powershell
$env:CATALOG_SEARCH_BACKEND="opensearch"; uvicorn catalog.api:create_app --factory --reload
```

On the docs page (http://localhost:8000/docs), add two or three items with different names and tags, then try **GET /search**.

**Step 4.** Ask OpenSearch directly, without our service, to see what it stored. Open these in your web browser:

- http://localhost:9200/catalog-items/_search?q=sales&pretty shows the documents that match "sales".
- http://localhost:9200/catalog-items/_mapping?pretty shows the mapping from section 2.

**Step 5.** When you're done, stop the service with **Control + C**, then stop OpenSearch:

```bash
docker compose down
```

On Windows, also switch off the search setting from Step 3, so the next time you start the service in this window it uses the stand-in again:

```powershell
Remove-Item Env:CATALOG_SEARCH_BACKEND
```

(On a Mac, the `NAME=value command` form only applies to that one command, so there's nothing to undo.)

---

## 5. Finished?

```bash
pytest exercises/test_m5_search.py
```

```bash
pytest
```

The first should show `3 passed`, and the second the same result as [setup Step 9](../README.md#step-9-run-the-checks-to-confirm-everything-works): everything passed and 1 skipped. You should also have seen your items come back from the real engine in section 4.

---

## 6. Check yourself

**a. Someone searches for tag `Sales` and gets nothing, though items are tagged `sales`. Name two places the bug could be.**

<details><summary>Answer</summary>

The search code might not lowercase the tag before the exact `term` match. Or the tags might have been stored without lowercasing (here `normalize_tags` from lesson 1 does that). Keyword fields are exact, so the capitals must match on both sides.
</details>

**b. After an outage, the search copy and the database disagree. How would you fix it?**

<details><summary>Answer</summary>

Rebuild the index from the database: read every item from the database and send each one to `index` again. The database is the official record, so the search copy can always be rebuilt from it.
</details>

**c. When would you use `match` rather than `term`?**

<details><summary>Answer</summary>

`match` for `text` fields, where you want word-by-word, ranked matching (names, descriptions). `term` for `keyword` fields, where you want an exact yes or no (tags, ids, owners).
</details>
