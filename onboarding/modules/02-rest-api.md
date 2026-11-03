# Module 2: REST APIs with FastAPI

**Goal:** add routes, use the right status codes, validate requests, and handle errors consistently. FastAPI writes the OpenAPI spec from your code, so good type hints become good API docs.

## Learn

- A **route** maps a method and path to a function: `@app.get("/items/{item_id}")`. Path parameters come from the URL; other function arguments become query parameters; a Pydantic model argument becomes the JSON body. [First steps](https://fastapi.tiangolo.com/tutorial/first-steps/)
- The return type annotation (`-> Item`) is the **response model**: FastAPI filters and documents the output with it.
- Status codes: 200 OK, 201 Created, 204 No Content, 404 Not Found, 409 Conflict, 422 invalid input. Pick the code that tells the client what to do next.
- `Query(ge=1, le=100)` validates query parameters. Bad input never reaches your function; FastAPI returns 422.
- **Dependencies** (`Depends(get_service)`) build what a route needs, per request, and clean up after. Tests can swap them. [Dependencies](https://fastapi.tiangolo.com/tutorial/dependencies/)
- **Exception handlers** turn a domain error (`ItemNotFoundError`) into an HTTP response in one place, so routes stay short. [Handling errors](https://fastapi.tiangolo.com/tutorial/handling-errors/)
- `/docs` (Swagger UI) and `/openapi.json` are generated. Docstrings become operation descriptions; `responses={404: {"model": ErrorResponse}}` documents error bodies. [OpenAPI metadata](https://fastapi.tiangolo.com/tutorial/metadata/)

## Read

Open `catalog/api.py`, then run the app and open http://localhost:8000/docs.

1. Follow `POST /items` from the route to the database. Which files and functions does it pass through?
2. Where does a 404 for a missing item come from? Find the `raise` and the handler.
3. Why is `create_app` a function instead of a module-level `app = FastAPI()`? (Hint: look at the `client` fixture in `conftest.py`.)
4. In `/docs`, try `POST /items` with `"kind": "spreadsheet"`. Read the 422 body. Which part tells you the field?

## Do

**1. `DELETE /items/{item_id}`.** Return 204 with an empty body. A missing item returns 404 with the same body as `GET`. The item must also disappear from search (`CatalogService.delete` already does this). Use `fastapi.Response(status_code=204)`. Document the 404 in `responses=`.

**2. Flatter validation errors.** Add an exception handler for `fastapi.exceptions.RequestValidationError` that returns 422 with:

```json
{"errors": [{"field": "kind", "message": "Input should be 'dataset', 'service' or 'document'"}]}
```

`field` is the error's `loc` without its first part (`body`, `query` or `path`); use the first remaining part. `exc.errors()` gives the list to build from.

## Done when

```bash
pytest exercises/test_m2_api.py
pytest
```

Both pass, and `DELETE` shows in `/docs` with its 204 and 404 responses.

## Check yourself

- A client sends a valid request for an item that was deleted. Which status code, and why not 400?
- Why handle `ItemNotFoundError` in one handler instead of try/except in every route?
- What does a client lose if your route returns `dict` instead of `Item`?
