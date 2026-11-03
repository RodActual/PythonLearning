# Lesson 1: Data modeling and JSON

**What you'll be able to do:** describe what a piece of data should look like, reject data that doesn't fit, and convert data from one layout to another.

**Time:** about 1 day.

**Before you start:**

1. Open a terminal, go to the onboarding folder, and turn the workspace on. The [README, Part 2](../README.md#part-2-every-time-you-come-back) shows how.
2. Open the `onboarding` folder in Visual Studio Code (**File > Open Folder**).

---

## 1. The ideas, in plain words

### Data needs a shape

Every item in the catalog has the same fields: a name, a kind, an owner, a description, some tags, and some extra details (called **metadata**). Writing that list down in code is called a **model**. Once a model exists, the program can check any incoming data against it.

This project uses a library called **Pydantic** for models. A model looks like this:

```python
class ItemCreate(BaseModel):
    name: str          # text
    kind: Kind         # one of "dataset", "service", "document"
    owner: str         # text
    tags: list[str]    # a list of text values
```

Each line is a field: its name, a colon, then what type of value it must hold.

### Checking data is called validation

When you create an `ItemCreate`, Pydantic checks every field. If something is wrong, for example `kind` is `"spreadsheet"`, it stops and raises a **ValidationError** that lists every bad field. The program never ends up holding bad data.

You can add your own checks with a **validator**. A validator is a small function that receives a field's value. It either returns the value (possibly cleaned up) to accept it, or raises `ValueError("reason")` to reject it. Look for `@field_validator` in the code; those are validators.

The rule to remember: **check data once, where it enters the program.** After that, the rest of the code can trust it.

### JSON is how data travels

**JSON** is a text format for data. It looks like this:

```json
{"name": "Sales orders", "kind": "dataset", "tags": ["sales", "erp"]}
```

Curly braces hold named values; square brackets hold lists. Python's built-in `json` module turns JSON text into Python values (`json.loads`) and back (`json.dumps`). Pydantic can read JSON straight into a model with `ItemCreate.model_validate_json(text)`.

### A note on spaces in Python

Python uses the spaces at the start of a line to know which lines belong together. When you paste code in this course, keep the same number of spaces as the code around it. VS Code shows faint vertical guide lines that help. If you see `IndentationError`, the spaces are off.

### Want more?

- [Pydantic: models](https://docs.pydantic.dev/latest/concepts/models/)
- [Pydantic: validators](https://docs.pydantic.dev/latest/concepts/validators/)

---

## 2. Look around the code

Open `catalog/models.py` in VS Code. Read it top to bottom, then answer these questions. Click a question's **Answer** to check yourself.

**a. What happens if someone sends a name made only of spaces?**

<details><summary>Answer</summary>

The `strip_text` validator removes the spaces, sees nothing is left, and raises `ValueError("must not be blank")`. Pydantic turns that into a ValidationError, so the item is rejected.
</details>

**b. What does `normalize_tags` do to `["  Sales", "sales", "ERP "]`?**

<details><summary>Answer</summary>

It trims spaces, lowercases, drops the duplicate, and sorts: `["erp", "sales"]`.
</details>

**c. `Item` is written as `class Item(ItemCreate)`. What does that mean?**

<details><summary>Answer</summary>

`Item` gets every field of `ItemCreate`, plus the two it adds itself: `id` and `created_at`. These are set by the server, so a client can't send them when creating an item.
</details>

Now open `tests/test_models.py`. Each function starting with `test_` is a check. Notice how short each one is: build some data, then `assert` what should be true.

---

## 3. Exercises

Run this command now:

```bash
pytest exercises/test_m1_models.py
```

All 5 checks fail. That's expected: each one is waiting for an exercise. As you finish each exercise, rerun the command and watch the failures go away.

**How to read a failure:** pytest prints a block for each failed check. The line starting with `E` says what went wrong, and the last line of the block names the file and line. `NotImplementedError: Module 1 exercise` just means "this exercise isn't done yet".

### Exercise 1: Flatten nested details

**Goal:** turn nested details into one flat list of keys joined by dots.

```
{"source": {"system": "erp", "id": 7}, "rows": 10}
becomes
{"source.system": "erp", "source.id": 7, "rows": 10}
```

**Where:** `catalog/transforms.py`, the function `flatten_metadata`. Its last line is `raise NotImplementedError("Module 1 exercise")`.

**Steps:**

1. Delete the line `raise NotImplementedError("Module 1 exercise")` inside `flatten_metadata`.
2. In its place, write code that goes through each key and value. If the value is itself a dictionary, flatten it with the key plus a dot as the new prefix. Otherwise, store it under the prefix plus the key.
3. Save the file (**Ctrl + S**, or **Command + S** on a Mac).
4. Run `pytest exercises/test_m1_models.py`. The three `test_flatten_...` checks should now pass.

<details><summary>Hint</summary>

Use `for key, value in metadata.items():` to go through each pair. `isinstance(value, dict)` tells you whether a value is a dictionary. A function can call itself (this is called recursion): `flatten_metadata(value, prefix=...)`. `some_dict.update(other_dict)` copies everything from one dictionary into another.
</details>

<details><summary>Show the answer</summary>

Replace the `raise NotImplementedError(...)` line in `flatten_metadata` with:

```python
    flat = {}
    for key, value in metadata.items():
        full_key = prefix + key
        if isinstance(value, dict):
            flat.update(flatten_metadata(value, prefix=full_key + "."))
        else:
            flat[full_key] = value
    return flat
```
</details>

### Exercise 2: Require snake_case detail names

**Goal:** reject metadata keys that aren't written in **snake_case**: lowercase letters, numbers and underscores, starting with a letter. `row_count` is fine; `rowCount` and `Row Count` aren't.

**Where:** `catalog/models.py`, inside `class ItemCreate`, at the comment `# Module 1 exercise: add a validator ...`.

**Steps:**

1. At the top of the file, under the opening comment block, add the line `import re`. (`re` is Python's tool for matching text patterns.)
2. Replace the comment `# Module 1 exercise: ...` with a new validator for the `"metadata"` field. Copy the shape of `normalize_tags` just above it.
3. Inside it, check each key with `re.fullmatch(r"[a-z][a-z0-9_]*", key)`. That returns nothing when the key doesn't match. In that case, raise a `ValueError` whose message includes the bad key.
4. Return the metadata unchanged if every key is fine.
5. Save, and run the checks. `test_metadata_keys_must_be_snake_case` should pass.

<details><summary>Show the answer</summary>

Add `import re` near the top of `catalog/models.py`, next to the other imports:

```python
import re
from datetime import datetime
```

Replace the `# Module 1 exercise: ...` comment with:

```python
    @field_validator("metadata")
    @classmethod
    def keys_are_snake_case(cls, metadata: dict[str, Any]) -> dict[str, Any]:
        for key in metadata:
            if not re.fullmatch(r"[a-z][a-z0-9_]*", key):
                raise ValueError(f"metadata key {key!r} must be snake_case, like row_count")
        return metadata
```
</details>

### Exercise 3: Import data from an old system

**Goal:** read `fixtures/legacy_export.json`, which came from an older system with different field names, and turn each record into an `ItemCreate`. Skip bad records and note why.

Open `fixtures/legacy_export.json` to see the data first. Here's how its fields map to ours:

| Old field | Our field | Rule |
|---|---|---|
| `title` | `name` | required |
| `type` | `kind` | make it lowercase |
| `contact` | `owner` | required |
| `notes` | `description` | if missing, use `""` (empty text) |
| `labels` | `tags` | it's one piece of text like `"sales, erp"`; split it on commas and drop empty pieces |
| `attrs` | `metadata` | if missing, use `{}` (empty) |

**Where:** `catalog/transforms.py`, the function `load_legacy_export`.

**Steps:**

1. At the top of the file, add `import json` and `from pydantic import ValidationError`.
2. Replace the `raise NotImplementedError(...)` line in `load_legacy_export` with code that:
   - reads the file and turns the JSON into a list of records,
   - for each record, builds an `ItemCreate` using the table above,
   - if building it raises `ValidationError`, skips that record and adds the text `"<position>: <error>"` to an errors list (the first record is position 0),
   - returns the list of items and the list of errors.
3. Save, and run the checks. All 5 should now pass.

<details><summary>Hint</summary>

`path.read_text()` reads a file as text. `json.loads(text)` turns JSON text into Python. `for index, record in enumerate(records):` gives you each record and its position. `record.get("notes", "")` reads a field, or gives `""` when it's missing. Wrap the `ItemCreate(...)` call in `try:` / `except ValidationError as error:`.
</details>

<details><summary>Show the answer</summary>

Make the imports at the top of `catalog/transforms.py` look like this:

```python
import json
from pathlib import Path
from typing import Any

from pydantic import ValidationError

from catalog.models import Item, ItemCreate
```

Replace the `raise NotImplementedError(...)` line in `load_legacy_export` with:

```python
    records = json.loads(path.read_text())
    items = []
    errors = []
    for index, record in enumerate(records):
        try:
            labels = record.get("labels", "")
            item = ItemCreate(
                name=record.get("title", ""),
                kind=record.get("type", "").lower(),
                owner=record.get("contact", ""),
                description=record.get("notes", ""),
                tags=[label for label in labels.split(",") if label.strip()],
                metadata=record.get("attrs", {}),
            )
        except ValidationError as error:
            errors.append(f"{index}: {error}")
            continue
        items.append(item)
    return items, errors
```
</details>

---

## 4. Finished?

Run both commands:

```bash
pytest exercises/test_m1_models.py
```

```bash
pytest
```

The first should show `5 passed`, and the second the same result as [setup Step 9](../README.md#step-9-run-the-checks-to-confirm-everything-works): everything passed and 1 skipped. If the second one now shows a failure, one of your changes broke something that used to work; the failure message names the file and line.

---

## 5. Check yourself

**a. A program reads items from a web form and from a nightly file import. Where should it check the data?**

<details><summary>Answer</summary>

At both entry points, in the same way: build the same Pydantic model from each source. Then everything after that point can trust the data.
</details>

**b. What's the difference between `model_dump()` and `model_dump_json()`?**

<details><summary>Answer</summary>

`model_dump()` gives a Python dictionary, for use inside the program. `model_dump_json()` gives JSON text, for saving to a file or sending to another program.
</details>

**c. A validator changes the value but forgets the `return` line. What happens?**

<details><summary>Answer</summary>

A Python function without `return` gives back `None`, so the field becomes `None` (or fails validation if `None` isn't allowed). Validators must always return the value.
</details>
