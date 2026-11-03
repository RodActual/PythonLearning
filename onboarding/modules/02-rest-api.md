# Lesson 2: REST APIs with FastAPI

**What you'll be able to do:** add new web addresses to a service, choose the right reply for each situation, and give clear error messages when a request is wrong.

**Time:** about 2 days.

**Before you start:** open a terminal in the onboarding folder with the workspace on ([README, Part 2](../README.md#part-2-every-time-you-come-back)), and open the folder in VS Code.

---

## 1. The ideas, in plain words

### An API is a list of things a program can be asked to do

The Catalog Service runs as a **server**: a program that waits for requests and answers them. Other programs (or you, through a web page) send requests to **web addresses** on it, such as `/items` or `/search`. The full set of addresses and what they do is the service's **API**.

Each request has a **method** that says what kind of action it is:

| Method | Meaning | Example |
|---|---|---|
| `GET` | Read something | `GET /items/5` reads item 5 |
| `POST` | Create something | `POST /items` adds a new item |
| `DELETE` | Remove something | `DELETE /items/5` removes item 5 |

A method plus an address is called a **route**.

### Every reply has a status code

The reply always carries a three-digit number saying how it went. These are the ones this course uses:

| Code | Meaning |
|---|---|
| 200 | OK, here's what you asked for |
| 201 | Created |
| 204 | Done, and there's nothing to send back |
| 404 | Not found |
| 409 | Conflict (for example, the name is already taken) |
| 422 | The request itself is wrong (a missing or invalid field) |
| 501 | Not built yet (used here for unfinished exercises) |

### FastAPI turns small functions into routes

This project uses a library called **FastAPI**. You write a normal function and put a line starting with `@app.` above it:

```python
@app.get("/items/{item_id}")
def get_item(item_id: int, ...) -> Item:
    return service.get(item_id)
```

That line says: when someone sends `GET /items/5`, run this function with `item_id = 5`. FastAPI reads the types you wrote (`int`, `Item`) and checks the request against them. If a request doesn't fit, FastAPI replies 422 before your function even runs.

### Errors are handled in one place

When something goes wrong deep inside, for example an item doesn't exist, the code **raises** an error such as `ItemNotFoundError`. An **exception handler** in `api.py` catches that error type and turns it into a reply (here, a 404). So each route stays short and doesn't need its own error checks.

### The docs page writes itself

FastAPI builds the page at http://localhost:8000/docs from your code. The description it shows comes from the text in quotes at the top of each route function. The same information is available in a machine-readable format at `/openapi.json`, which other teams can use to build tools that call your API.

### Want more?

- [FastAPI tutorial: first steps](https://fastapi.tiangolo.com/tutorial/first-steps/)
- [FastAPI: handling errors](https://fastapi.tiangolo.com/tutorial/handling-errors/)

---

## 2. Look around the code

1. Start the service:

   ```bash
   uvicorn catalog.api:create_app --factory --reload
   ```

2. Open http://localhost:8000/docs. Click **POST /items**, then **Try it out**, then **Execute**. Scroll down to see the reply: code 201 and the new item.
3. Click **Execute** again with the same data. You'll get 409, because the name is taken.
4. Change `"kind": "dataset"` to `"kind": "spreadsheet"` and click **Execute**. Read the 422 reply.
5. Open `catalog/api.py` in VS Code.

`--reload` means the service restarts by itself whenever you save a file, so leave it running while you work. Use a second terminal window for `pytest` (open it, go to the folder, and turn the workspace on, as in [README, Part 2](../README.md#part-2-every-time-you-come-back)).

**a. When you send `POST /items`, which functions run, and in which files?**

<details><summary>Answer</summary>

`register_item` in `catalog/api.py` → `CatalogService.register` in `catalog/service.py` → `ItemRepository.add` in `catalog/repository.py` (saves to the database), then `search_backend.index` in `catalog/search.py` (adds it to search).
</details>

**b. Where does the 404 for a missing item come from?**

<details><summary>Answer</summary>

`CatalogService.get` in `service.py` raises `ItemNotFoundError`. The handler `not_found` in `api.py` turns it into a 404 reply.
</details>

**c. In the 422 reply from step 4, which part tells you which field was wrong?**

<details><summary>Answer</summary>

`"loc": ["body", "kind"]`. `body` means the data you sent, and `kind` is the field. In Exercise 2 you'll make this reply easier to read.
</details>

---

## 3. Exercises

Run:

```bash
pytest exercises/test_m2_api.py
```

All 5 checks fail at first. That's expected.

### Exercise 1: Add a way to delete an item

**Goal:** `DELETE /items/5` removes item 5 and replies 204 with nothing in the body. If item 5 doesn't exist, it replies 404 with the same message as `GET` does. The item must also disappear from search; `CatalogService.delete` already does that part.

**Where:** `catalog/api.py`, at the comment `# Module 2 exercise: add DELETE /items/{item_id}.`

**Steps:**

1. At the top of `api.py`, change `from fastapi import Depends, FastAPI, Query, Request` so it also imports `Response`.
2. Replace the comment with a new route. Model it on `get_item` just above, but use `@app.delete(...)` with `status_code=204`.
3. In the function, call `service.delete(item_id)`, then return `Response(status_code=204)`.
4. So the docs page lists the 404, add `responses={404: {"model": ErrorResponse}}` inside `@app.delete(...)`, like `get_item` has.
5. Save. Refresh the docs page: **DELETE /items/{item_id}** appears. Try it.

You don't need to write any code for the 404: `service.delete` raises `ItemNotFoundError`, and the existing handler deals with it.

<details><summary>Show the answer</summary>

Change the import line at the top of `catalog/api.py` to:

```python
from fastapi import Depends, FastAPI, Query, Request, Response
```

Replace the `# Module 2 exercise: add DELETE ...` comment with:

```python
    @app.delete("/items/{item_id}", status_code=204, tags=["items"], responses={404: {"model": ErrorResponse}})
    def delete_item(item_id: int, service: CatalogService = Depends(get_service)) -> Response:
        """Remove an item from the catalog and the search index."""
        service.delete(item_id)
        return Response(status_code=204)
```
</details>

### Exercise 2: Make error messages easier to read

**Goal:** when a request is invalid, reply 422 with this simpler layout instead of FastAPI's default one:

```json
{"errors": [{"field": "kind", "message": "Input should be 'dataset', 'service' or 'document'"}]}
```

**Where:** `catalog/api.py`, at the comment `# Module 2 exercise: add a RequestValidationError handler here.`

**Steps:**

1. At the top of `api.py`, add the line `from fastapi.exceptions import RequestValidationError`. This is the error FastAPI raises when a request doesn't fit.
2. Replace the comment with a new exception handler. Copy the shape of `not_found` a few lines above, but use `RequestValidationError`.
3. Inside it, `exc.errors()` gives a list of problems. Each problem has a `"loc"` (where it is, like `("body", "kind")`) and a `"msg"` (what's wrong).
4. For each problem, drop the first part of `loc` (`body`, `query` or `path`), use what comes next as `field`, and use `msg` as `message`.
5. Return a `JSONResponse` with `status_code=422` and `{"errors": [...]}`.
6. Save, and repeat step 4 from section 2 on the docs page to see the new reply.

<details><summary>Show the answer</summary>

Add this line under the other `from fastapi ...` import at the top of `catalog/api.py`:

```python
from fastapi.exceptions import RequestValidationError
```

Replace the `# Module 2 exercise: add a RequestValidationError handler here.` comment with:

```python
    @app.exception_handler(RequestValidationError)
    def invalid_request(_: Request, exc: RequestValidationError) -> JSONResponse:
        errors = []
        for error in exc.errors():
            location = error["loc"][1:]  # drop "body", "query" or "path"
            field = str(location[0]) if location else "request"
            errors.append({"field": field, "message": error["msg"]})
        return JSONResponse(status_code=422, content={"errors": errors})
```
</details>

---

## 4. Finished?

```bash
pytest exercises/test_m2_api.py
```

```bash
pytest
```

The first should show `5 passed`, and the second the same result as [setup Step 9](../README.md#step-9-run-the-checks-to-confirm-everything-works): everything passed and 1 skipped. Also check that **DELETE /items/{item_id}** shows on the docs page with its 204 and 404 replies.

---

## 5. Check yourself

**a. Someone asks for an item that was deleted. Which status code should they get, and why not 422?**

<details><summary>Answer</summary>

404. Their request was well formed, so it isn't a 422; the thing they asked for just isn't there.
</details>

**b. Why handle `ItemNotFoundError` once in a handler instead of in every route?**

<details><summary>Answer</summary>

Every route gets the same reply with no repeated code, and a new route gets it for free. If the reply ever changes, there's one place to change it.
</details>

**c. What would other teams lose if a route's function said `-> dict` instead of `-> Item`?**

<details><summary>Answer</summary>

The docs page and `/openapi.json` would no longer describe what the reply contains, and FastAPI would stop checking the reply's shape. Teams building on your API would have to guess.
</details>
