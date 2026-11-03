# Backend onboarding track

A hands-on path from the PythonLearning course to working backend Python. It covers the six areas the core course leaves out: REST APIs, JSON and data modeling, database and search clients, pytest, reading and debugging code, and packaging for containers.

You learn by working on one small, realistic codebase: a **Catalog Service** that registers objects, tags them with metadata, stores them in a database, indexes them for search, and serves it all over a REST API. Most of the job is reading and changing code like this, so each module has you read first, then extend.

This track runs on your own machine, not in the browser app, because it needs pip, a web server, a database and Docker.

## Setup (once)

Needs Python 3.11 or newer. Docker is needed only for Modules 5 and 7.

```bash
cd onboarding
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
pytest                           # reference tests: all should pass
uvicorn catalog.api:create_app --factory --reload
```

Open http://localhost:8000/docs to see and call the API.

## How each module works

1. **Learn**: a short list of the ideas, with links to the official docs.
2. **Read**: files to trace in the Catalog Service, with questions to answer.
3. **Do**: exercises. Each has checks in `exercises/` that fail until you finish it.
4. **Check yourself**: questions to answer without looking.

`pytest` runs the reference tests in `tests/`. `pytest exercises/test_m1_models.py` runs one module's checks. Keep `pytest` green as you go: if a reference test breaks, your change broke something.

## Modules

| # | Module | Covers | Time |
|---|---|---|---|
| 1 | [Data modeling and JSON](modules/01-data-modeling.md) | Pydantic, validation, parsing and transforming JSON | 1 day |
| 2 | [REST APIs with FastAPI](modules/02-rest-api.md) | Routes, status codes, request validation, error handling, OpenAPI | 2 days |
| 3 | [Testing with pytest](modules/03-testing.md) | Fixtures, parametrize, mocking, `caplog`, `monkeypatch` | 1 day |
| 4 | [Databases with SQLAlchemy](modules/04-database.md) | Tables, relationships, sessions, queries, `GROUP BY` | 2 days |
| 5 | [Search with OpenSearch](modules/05-search.md) | Indexes, mappings, query DSL, filters, testing without a server | 1.5 days |
| 6 | [Reading and debugging code](modules/06-debugging.md) | Tracebacks, logging, `breakpoint()`, tracing a request | 1 day |
| 7 | [Packaging for containers](modules/07-packaging.md) | venv, `requirements.txt`, config from env vars, Docker, CI | 1.5 days |

About 10 working days at 1.5 to 2 hours a day. Modules 3 and 6 can move earlier if testing and debugging matter most in your first weeks.

## Layout

```
catalog/          the service: models, api, service, repository, db, search, config
tests/            reference tests (keep these passing)
exercises/        checks for your exercises, one file per module
bughunt/          a small script with real bugs, for Module 6
fixtures/         sample data from a "legacy system", for Module 1
modules/          the lesson for each module
```

Stuck on an exercise? Read the reference tests for the same file first. They show the style, and they're usually one step from the answer.
