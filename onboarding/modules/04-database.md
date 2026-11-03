# Lesson 4: Databases with SQLAlchemy

**What you'll be able to do:** read how data is stored in tables, ask the database questions, and have it do counting and filtering for you.

**Time:** about 2 days.

**Before you start:** open a terminal in the onboarding folder with the workspace on ([README, Part 2](../README.md#part-2-every-time-you-come-back)), and open the folder in VS Code.

---

## 1. The ideas, in plain words

### A database stores data in tables

A **database** keeps data in **tables**, like spreadsheets. Each table has fixed **columns**, and each **row** is one record. The Catalog Service uses three tables:

**items**

| id | name | kind | owner | description | metadata | created_at |
|---|---|---|---|---|---|---|
| 1 | Sales orders | dataset | data-team | Daily orders | {"rows": 1200} | 2026-11-03 ... |
| 2 | Payroll | dataset | hr-team | | {} | 2026-11-03 ... |

**tags**

| id | name |
|---|---|
| 1 | sales |
| 2 | erp |
| 3 | hr |

**item_tags** (which item has which tag)

| item_id | tag_id |
|---|---|
| 1 | 1 |
| 1 | 2 |
| 2 | 3 |

So item 1 has tags `sales` and `erp`, and item 2 has tag `hr`. Each tag is stored once and shared by every item that uses it. A link table like `item_tags` is how databases store "many items can have many tags".

### SQL is the database's language; SQLAlchemy writes it for you

Databases understand a language called **SQL**:

```sql
SELECT name FROM items WHERE owner = 'hr-team'
```

**SQLAlchemy** is a Python library that lets you build the same question in Python and sends the SQL for you:

```python
select(ItemRow.name).where(ItemRow.owner == "hr-team")
```

Useful pieces:

| Python | What it does |
|---|---|
| `select(ItemRow)` | Get whole rows from the items table |
| `.where(ItemRow.owner == "hr-team")` | Only rows that match |
| `.order_by(ItemRow.id)` | Sort |
| `.limit(10)` | At most 10 rows |
| `.join(other_table, condition)` | Combine two tables where the condition matches |
| `func.count()` | Count rows |
| `.group_by(TagRow.name)` | Count (or add up) separately for each tag name |

### A session is a conversation with the database

A **session** sends your questions and changes to the database. `session.add(row)` lines up a new row, and `session.commit()` saves everything for good. If something fails, `session.rollback()` cancels what wasn't saved. Each web request gets its own session.

### Keep database code in one place

All the database code lives in `ItemRepository` in `catalog/repository.py`. The rest of the program asks the repository for things (`repo.get(5)`, `repo.list_items(tag="sales")`) and never writes SQL itself. This is called the **repository pattern**. It means a change to how data is stored only touches one file.

### Ask once, not many times

A common slow-down is asking the database one question per row, for example counting tags by loading every item and counting in Python. One question with `group_by` lets the database do the counting, which is much faster on large data.

### Want more?

- [SQLAlchemy ORM quickstart](https://docs.sqlalchemy.org/en/20/orm/quickstart.html)

---

## 2. Look around the code

Open `catalog/db.py`, then `catalog/repository.py`.

**a. In `db.py`, which line makes item names unique?**

<details><summary>Answer</summary>

`name: Mapped[str] = mapped_column(String(200), unique=True)` in `ItemRow`. `unique=True` makes the database refuse a second item with the same name.
</details>

**b. In `repository.py`, what does `add` do when the name is already taken?**

<details><summary>Answer</summary>

The database refuses the save with an `IntegrityError`. `add` cancels the attempt with `rollback()`, confirms the name exists, and raises `DuplicateItemError`. The API turns that into a 409 reply.
</details>

**c. What SQL does `list_items(tag="sales")` send?** Find out:

1. In `list_items`, just above the line `return [to_item(row) for row in self.session.scalars(stmt)]`, add a new line, `print(stmt)`, at the same indentation.
2. Run `pytest -s tests/test_repository.py`. (`-s` shows printed text.)
3. Look for `SELECT ...` in the output.
4. Delete the `print(stmt)` line again and save.

<details><summary>Answer</summary>

Something like `SELECT items.id, items.name, ... FROM items WHERE EXISTS (SELECT 1 FROM item_tags, tags WHERE ... AND tags.name = :name_1) ORDER BY items.id LIMIT ... OFFSET ...`. The `:name_1` is filled in with `sales` when it runs.
</details>

**d. Why does `to_item` exist, instead of handing database rows straight to the API?**

<details><summary>Answer</summary>

It turns a database row into the `Item` model from lesson 1. That way the API never depends on how the tables are laid out; the tables can change without changing what clients see.
</details>

---

## 3. Exercises

Run:

```bash
pytest exercises/test_m4_database.py
```

All 5 checks fail at first. That's expected.

### Exercise 1: Count items per tag

**Goal:** `count_by_tag()` returns how many items use each tag, like `{"erp": 1, "sales": 2}`, using **one** database question with `group_by`. Tags no item uses don't appear.

**Where:** `catalog/repository.py`, the method `count_by_tag` at the bottom.

**Steps:**

1. At the top of the file, change `from sqlalchemy import select` to also import `func`, and change `from catalog.db import ItemRow, TagRow` to also import `item_tags`.
2. Replace the two lines inside `count_by_tag` (the text in triple quotes and the `raise NotImplementedError(...)`) with a query that selects the tag name and a count, joins the tags table to `item_tags`, and groups by tag name.
3. Run it with `self.session.execute(stmt)`. Each result row is a pair: name and count. Turn those pairs into a dictionary and return it.

<details><summary>Hint</summary>

`.join(item_tags, item_tags.c.tag_id == TagRow.id)` connects each tag to its rows in the link table. Joining only keeps tags that have at least one row there, which is why unused tags drop out by themselves.
</details>

<details><summary>Show the answer</summary>

Make these two import lines at the top of `catalog/repository.py` read:

```python
from sqlalchemy import func, select
```

```python
from catalog.db import ItemRow, TagRow, item_tags
```

Replace the body of `count_by_tag` with:

```python
    def count_by_tag(self) -> dict[str, int]:
        stmt = (
            select(TagRow.name, func.count())
            .join(item_tags, item_tags.c.tag_id == TagRow.id)
            .group_by(TagRow.name)
        )
        return {name: count for name, count in self.session.execute(stmt)}
```
</details>

### Exercise 2: Show the counts at `GET /tags`

**Goal:** a new address, `GET /tags`, replies with the counts from Exercise 1.

**Steps:**

1. In `catalog/service.py`, add a method `tag_counts` to `CatalogService` that returns `self.repo.count_by_tag()`. Put it right after `list_items`.
2. In `catalog/api.py`, replace the comment `# Module 4 exercise: add GET /tags.` with a route that calls `service.tag_counts()`. Copy the shape of `list_items` in the same file.

<details><summary>Show the answer</summary>

In `catalog/service.py`, after the `list_items` method:

```python
    def tag_counts(self) -> dict[str, int]:
        return self.repo.count_by_tag()
```

In `catalog/api.py`, replace `# Module 4 exercise: add GET /tags.` with:

```python
    @app.get("/tags", tags=["items"])
    def tag_counts(service: CatalogService = Depends(get_service)) -> dict[str, int]:
        """How many items use each tag."""
        return service.tag_counts()
```
</details>

### Exercise 3: Filter the list by owner

**Goal:** `GET /items?owner=hr-team` lists only that owner's items.

You'll pass a new `owner` setting through three layers: the API, the service, and the repository.

**Steps:**

1. **Repository** (`catalog/repository.py`, `list_items`): add `owner: str | None = None` to the brackets, and, after the `if tag:` block, add a second block that filters on `ItemRow.owner == owner` when an owner is given.
2. **Service** (`catalog/service.py`, `list_items`): add `owner: str | None = None` to the brackets and pass `owner=owner` on to the repository.
3. **API** (`catalog/api.py`, `list_items`): add `owner: str | None = None,` under `tag: str | None = None,` and pass `owner=owner` to the service.

<details><summary>Show the answer</summary>

`catalog/repository.py`:

```python
    def list_items(
        self, tag: str | None = None, limit: int = 50, offset: int = 0, owner: str | None = None
    ) -> list[Item]:
        stmt = select(ItemRow).order_by(ItemRow.id).limit(limit).offset(offset)
        if tag:
            stmt = stmt.where(ItemRow.tags.any(TagRow.name == tag.lower()))
        if owner:
            stmt = stmt.where(ItemRow.owner == owner)
        return [to_item(row) for row in self.session.scalars(stmt)]
```

`catalog/service.py`:

```python
    def list_items(self, tag: str | None, limit: int, offset: int, owner: str | None = None) -> list[Item]:
        return self.repo.list_items(tag=tag, limit=limit, offset=offset, owner=owner)
```

`catalog/api.py`:

```python
    @app.get("/items", tags=["items"])
    def list_items(
        tag: str | None = None,
        owner: str | None = None,
        limit: int = Query(50, ge=1, le=100),
        offset: int = Query(0, ge=0),
        service: CatalogService = Depends(get_service),
    ) -> list[Item]:
        return service.list_items(tag=tag, limit=limit, offset=offset, owner=owner)
```
</details>

---

## 4. Finished?

```bash
pytest exercises/test_m4_database.py
```

```bash
pytest
```

The first should show `5 passed`, and the second `38 passed, 1 skipped`. On the docs page, try **GET /tags** and **GET /items** with an owner.

---

## 5. Check yourself

**a. Why does a tag whose only item was deleted disappear from `count_by_tag` without any extra code?**

<details><summary>Answer</summary>

Deleting the item removes its rows from `item_tags`. The join only keeps tags that still have rows there, so the unused tag is left out.
</details>

**b. `GET /items?owner=...` gets slow once there are millions of items. What would you add, and how would you check it helped?**

<details><summary>Answer</summary>

An **index** on the `owner` column: a lookup structure that lets the database find matching rows without reading every row. Check by timing the request before and after, or by asking the database for its plan with `EXPLAIN`.
</details>

**c. What could go wrong if two web requests shared one session?**

<details><summary>Answer</summary>

One request's `commit()` or `rollback()` would save or cancel the other's half-finished changes, and errors in one would break the other. That's why each request gets its own.
</details>
