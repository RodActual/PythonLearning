# Module 4: Databases with SQLAlchemy

**Goal:** model tables, read and write through a session, and write queries that do the work in SQL instead of in Python loops. The Catalog Service's object registry is a relational database.

## Learn

- SQLAlchemy 2.0 has two layers: **Core** (tables and SQL expressions) and the **ORM** (Python classes mapped to tables). This code uses the ORM with 2.0-style `select()`. [ORM quickstart](https://docs.sqlalchemy.org/en/20/orm/quickstart.html)
- `DeclarativeBase`, `Mapped[...]` and `mapped_column()` declare a table and its columns with type hints.
- `relationship(secondary=...)` gives a many-to-many link through an association table (`item_tags` here). One tag row is shared by every item that uses it.
- A **session** tracks objects and turns changes into SQL. `add()` stages, `commit()` writes, `rollback()` undoes after an error. One session per request.
- `select(Model).where(...).order_by(...).limit(...)` builds a query; `session.scalars(stmt)` runs it and returns objects. `session.execute(stmt)` returns rows with columns.
- `func.count()` with `group_by()` counts per group in one query. Loading everything and counting in Python is the N+1 mistake at small scale.
- `create_all()` builds tables for a demo. Real services use migrations ([Alembic](https://alembic.sqlalchemy.org/en/latest/tutorial.html)) so schema changes are versioned.
- The **repository** pattern keeps SQL in one class. The service and API never import SQLAlchemy.

## Read

Open `catalog/db.py` and `catalog/repository.py`.

1. Draw the three tables and their keys. Which column makes item names unique?
2. In `add`, what happens on a duplicate name? Why call `rollback()` before raising?
3. `list_items(tag="sales")` uses `ItemRow.tags.any(...)`. Add `print(stmt)` above the return and run `pytest -s tests/test_repository.py`. What SQL does it print?
4. Why does `to_item` exist, instead of returning `ItemRow` objects to the API?

## Do

**1. `count_by_tag()`.** Return `{tag_name: item_count}` for tags used by at least one item, in **one** query with `GROUP BY`. Join `TagRow` to `item_tags` (imported from `catalog.db`); use `select(TagRow.name, func.count())`.

**2. `GET /tags`.** Return the counts as JSON. Add a `tag_counts()` method to `CatalogService` that calls the repository, and a route that calls the service.

**3. Filter by owner.** Add an optional `owner` argument to `ItemRepository.list_items`, `CatalogService.list_items` and the `GET /items` query string.

## Done when

```bash
pytest exercises/test_m4_database.py
pytest
```

Both pass.

## Check yourself

- Why does `count_by_tag` skip a tag whose only item was deleted, without any extra code?
- Where would you add an index if `list_items(owner=...)` got slow, and how would you check it helped?
- What breaks if two requests share one session?
