# Lesson 7: Packaging for containers

**What you'll be able to do:** make a program run the same way on your computer, on a test server, and in production, by fixing its tool versions, reading its settings from outside the code, and packaging it with Docker.

**Time:** about 1.5 days.

**Before you start:**

1. Open a terminal in the onboarding folder with the workspace on ([README, Part 2](../README.md#part-2-every-time-you-come-back)), and open the folder in VS Code.
2. Open Docker Desktop ([README, Part 3](../README.md#lessons-5-and-7-install-docker-desktop)). You need it for exercises 2 and 3.

---

## 1. The ideas, in plain words

### "It works on my computer" is the problem this lesson solves

A program depends on many things besides its own code: the Python version, the libraries and their versions, and settings such as where the database is. If any of those differ between two computers, the program can behave differently. Each idea below removes one of those differences.

### A private workspace per project

You made one in the README's setup: the `.venv` folder. It holds this project's libraries, separate from every other project, so two projects can use different versions of the same library without clashing.

### Write down exact versions

`requirements.txt` lists every library the service needs, with an exact version:

```
fastapi==0.156.4
```

`==` means exactly this version. `requirements-dev.txt` adds the tools only developers need (like `pytest`) and includes the main list with its first line, `-r requirements.txt`.

Those libraries depend on other libraries in turn, and those would otherwise float to whatever is newest on the day you install. So `constraints.txt` pins *everything* that ends up installed, and `requirements.txt` applies it with the line `-c constraints.txt`. The result: anyone who installs gets exactly the same set you have, today or in a year. This course learned that the hard way: an unpinned library that had no ready-made install for Python 3.14 broke setup on a new computer.

### Settings come from outside the code

Things that change between computers, such as the database address, the search server address, and how much to log, shouldn't be written into the code. They're read from **environment variables**: named values that the terminal, Docker or the server's settings pass to the program when it starts.

This project reads every variable whose name starts with `CATALOG_` into a `Settings` object (`catalog/config.py`). `CATALOG_DATABASE_URL` becomes `settings.database_url`, and so on. Pydantic checks them, just like the models in lesson 1. For local runs, you can also put them in a file named `.env`; `.env.example` shows the format.

Passwords and keys always go in environment variables, never in the code, because code gets copied, shared and stored in version history.

### Docker: ship the whole box

**Docker** packages a program together with everything it needs (an operating system, Python, the libraries, the code) into an **image**. Running an image gives you a **container**: a sealed, running copy that behaves the same on any machine with Docker.

The recipe for an image is the **Dockerfile**. Open it and read it alongside this list:

| Line | What it does |
|---|---|
| `FROM python:3.12-slim` | Start from a small Linux system with Python 3.12 |
| `COPY requirements.txt .` then `RUN pip install ...` | Install the libraries. These come before copying the code so Docker can reuse this step when only the code changes. |
| `COPY catalog ./catalog` | Add the code |
| `USER app` | Run as an ordinary user, not the all-powerful admin user, for safety |
| `ENV CATALOG_DATABASE_URL=...` | A default setting, which can be overridden when starting the container |
| `CMD ["uvicorn", ...]` | The command that runs when the container starts |

`.dockerignore` lists files to leave out of the image, such as tests and your local `.env`.

### Docker Compose: several containers together

The service needs OpenSearch next to it. `docker-compose.yml` describes both containers, the settings each gets, and how they connect. `docker compose up` starts them all. Inside Compose, containers reach each other by name, so the service finds OpenSearch at `http://opensearch:9200`.

### Automatic checks on every change

This repository runs the onboarding checks on GitHub every time code is pushed: it installs from `requirements-dev.txt` on a clean machine and runs `pytest`. That's called **CI** (continuous integration). The steps are in `.github/workflows/ci.yml` at the top of the repository, under `onboarding:`.

### Want more?

- [Python: virtual environments](https://docs.python.org/3/library/venv.html)
- [pydantic-settings](https://docs.pydantic.dev/latest/concepts/pydantic_settings/)
- [Docker: building best practices](https://docs.docker.com/build/building/best-practices/)

---

## 2. Look around the code

Open `catalog/config.py`, `Dockerfile`, `docker-compose.yml` and `.env.example`.

**a. If `.env` says one database address and an environment variable says another, which wins?**

<details><summary>Answer</summary>

The environment variable. `.env` only fills in values that aren't already set, which is what the first line of `.env.example` says.
</details>

**b. The Dockerfile stores the database at `/data/catalog.db`. What keeps that data when a container is replaced?**

<details><summary>Answer</summary>

Nothing, on its own: a container's files disappear with it. In `docker-compose.yml`, the line `- catalog-data:/data` attaches a **volume** (storage that lives outside the container) at `/data`, so the database survives. You'll see the difference in exercises 2 and 3.
</details>

**c. In `docker-compose.yml`, why is the search address `http://opensearch:9200` and not `http://localhost:9200`?**

<details><summary>Answer</summary>

Inside a container, `localhost` means that container itself. Compose gives each container a name the others can use, so the service reaches the search container as `opensearch`.
</details>

**d. What could go wrong if `requirements.txt` said `fastapi>=0.100` instead of an exact version?**

<details><summary>Answer</summary>

`>=` means "this version or newer". A new install could pick up a newer version that behaves differently, so the code might break on a new machine but not on yours, with no change to the code.
</details>

---

## 3. Exercises

Run:

```bash
pytest exercises/test_m7_config.py
```

All 4 checks fail at first. That's expected.

### Exercise 1: Add a `CATALOG_LOG_LEVEL` setting

**Goal:** a new setting, `log_level`, that:

- is `INFO` when not set,
- accepts any capitalisation (`debug` becomes `DEBUG`),
- rejects anything other than `DEBUG`, `INFO`, `WARNING`, `ERROR` or `CRITICAL`,
- is used by the app when it starts.

**Steps:**

1. In `catalog/config.py`, add `from pydantic import field_validator` above the `from pydantic_settings ...` line.
2. Replace the comment `# Module 7 exercise: add log_level here.` with a field `log_level: str = "INFO"`, followed by a validator that uppercases the value and raises `ValueError` if it isn't one of the five allowed levels. Copy the shape of the validators in `catalog/models.py`.
3. In `catalog/api.py`, inside `create_app`, change `configure_logging()` to `configure_logging(settings.log_level)`.
4. In `.env.example`, add a line `CATALOG_LOG_LEVEL=INFO`.
5. Save and run the checks.

<details><summary>Show the answer</summary>

The top of `catalog/config.py`:

```python
from functools import lru_cache
from typing import Literal

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
```

Replace `# Module 7 exercise: add log_level here.` with:

```python
    log_level: str = "INFO"

    @field_validator("log_level")
    @classmethod
    def known_log_level(cls, value: str) -> str:
        value = value.upper()
        if value not in {"DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"}:
            raise ValueError("must be DEBUG, INFO, WARNING, ERROR or CRITICAL")
        return value
```

In `catalog/api.py`, inside `create_app`:

```python
    configure_logging(settings.log_level)
```
</details>

### Exercise 2: Build and run the image

1. Build the image. The first time takes a few minutes. The `.` at the end means "use the Dockerfile in this folder".

   ```bash
   docker build -t catalog .
   ```

   It's done when you're back at the prompt with no red `ERROR` lines.

2. Start a container from it, with debug logging:

   ```bash
   docker run --rm -p 127.0.0.1:8000:8000 -e CATALOG_LOG_LEVEL=debug catalog
   ```

   `-p 127.0.0.1:8000:8000` connects port 8000 on your computer to the container's, and only for your computer: other machines on your network can't reach it. That matters because this API has no sign-in. `-e` sets an environment variable. You should see `Uvicorn running on http://0.0.0.0:8000`.

3. Open http://localhost:8000/docs and add an item.
4. Stop the container with **Control + C**. Run the `docker run` command again, open the docs page, and try **GET /items**. The item is gone. Why? (See question b in section 2.)

### Exercise 3: Run the whole system

1. Start the service and OpenSearch together:

   ```bash
   docker compose up --build
   ```

   It's ready when the log shows `Uvicorn running`. The first start takes a minute or two while OpenSearch starts.

2. On http://localhost:8000/docs, add an item.
3. Stop everything with **Control + C**, then run:

   ```bash
   docker compose down
   ```

   ```bash
   docker compose up
   ```

4. Try **GET /items**. The item is still there this time, because of the volume. Find the `catalog-data` lines in `docker-compose.yml` that make the difference.
5. Now try **GET /search** for that item. It isn't found: OpenSearch has no volume in this file, so its copy was lost, while the database kept the item. That's the situation from lesson 5's question b, and why the database, not the search engine, is the official record.
6. Stop with **Control + C** and `docker compose down`.

### Exercise 4: Start from nothing

This is what CI does on every change.

1. Turn the workspace off with `deactivate`.
2. Delete the `.venv` folder in your file window (or in VS Code's file list: right-click it, then **Delete**).
3. Repeat setup Steps 6 to 9 in the [README](../README.md#step-6-create-a-private-workspace-for-this-project).
4. `pytest` should give the same result as before.

---

## 4. Finished?

```bash
pytest exercises/test_m7_config.py
```

```bash
pytest
```

The first should show `4 passed`, and the second the same result as [setup Step 9](../README.md#step-9-run-the-checks-to-confirm-everything-works): everything passed and 1 skipped. You should also have run the service from `docker compose up`.

---

## 5. Check yourself

**a. A teammate puts a database password straight into `config.py`, "just for now". What are two problems, and what's the fix?**

<details><summary>Answer</summary>

Anyone who can see the code can see the password, and it stays in the version history even after it's removed. Every environment would also have to share the same password. The fix: read it from an environment variable, and change the password, since it's already exposed.
</details>

**b. The image is 1 GB, and every code change takes minutes to rebuild. What do you check first?**

<details><summary>Answer</summary>

That the library install comes before copying the code in the Dockerfile, so it can be reused; and that `.dockerignore` leaves out large folders such as `.venv`, test data and caches. Starting from a `slim` base image also helps.
</details>

**c. CI passes, but the container fails when it starts. What's different, and how do you find out?**

<details><summary>Answer</summary>

CI runs the tests with test settings; the container runs the real start command with its own settings and files. Read the container's log (`docker compose logs api`) for the traceback, and compare the environment variables each one gets.
</details>
