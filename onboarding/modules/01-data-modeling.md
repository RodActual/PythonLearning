# Module 1: Data modeling and JSON

**Goal:** define data shapes with Pydantic, validate untrusted input, and transform JSON from one shape to another. Metadata tagging and object registration are mostly this.

## Learn

- A **model** is a class that declares fields and their types. Pydantic checks and converts input when you create one, and raises `ValidationError` listing every bad field. [Pydantic models](https://docs.pydantic.dev/latest/concepts/models/)
- `Field(...)` adds rules (`min_length`, `max_length`, `ge`, `le`, defaults). `Literal[...]` limits a field to fixed values.
- `@field_validator` runs your own check or cleanup on one field. Raise `ValueError` to reject; return the value to accept (possibly changed). [Validators](https://docs.pydantic.dev/latest/concepts/validators/)
- `model_validate_json(text)` parses and validates in one step. `model_dump()` gives a dict; `model_dump_json()` gives JSON text.
- `dataclasses` are the standard-library option: typed fields, no validation. Use Pydantic at boundaries (API input, files, other systems) and plain dataclasses inside code you control. [dataclasses](https://docs.python.org/3/library/dataclasses.html)
- Validate once where data enters. After that, the rest of the code can trust it.

## Read

Open `catalog/models.py` and `tests/test_models.py`.

1. What does `ItemCreate(name="  ", kind="dataset", owner="o")` raise, and which validator raises it?
2. Why does `Item` inherit from `ItemCreate` instead of repeating the fields?
3. `normalize_tags` returns a new list. What would go wrong if it changed `tags` in place and returned nothing?
4. Open `catalog/transforms.py`. Why does `to_search_doc` leave out `metadata`?

## Do

**1. Flatten metadata.** Implement `flatten_metadata` in `catalog/transforms.py`. Nested dicts become dotted keys; anything else is kept as it is. Recursion fits well here.

**2. snake_case metadata keys.** Add a `@field_validator("metadata")` to `ItemCreate` that rejects any top-level key not matching `[a-z][a-z0-9_]*`, and names the bad key in the message.

**3. Import a legacy export.** Implement `load_legacy_export(path)`. Read `fixtures/legacy_export.json` and map each record:

| Legacy field | ItemCreate field | Rule |
|---|---|---|
| `title` | `name` | required |
| `type` | `kind` | lowercase it |
| `contact` | `owner` | required |
| `notes` | `description` | missing → `""` |
| `labels` | `tags` | comma-separated string → list; drop empty entries |
| `attrs` | `metadata` | missing → `{}` |

Catch `ValidationError` per record, skip that record, and add `"<index>: <message>"` to the errors list (index starts at 0). Don't stop at the first bad record.

## Done when

```bash
pytest exercises/test_m1_models.py
pytest
```

Both pass.

## Check yourself

- Where should validation live in a service that reads from an API and from a nightly file import?
- What's the difference between `model_dump()` and `model_dump_json()`, and when would you use each?
- A teammate's validator mutates its input and returns `None`. What does the field end up as?
