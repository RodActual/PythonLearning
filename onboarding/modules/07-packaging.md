# Module 7: Packaging for containers

**Goal:** make the code run the same on your laptop, in CI and in Docker. The rules: isolate dependencies, pin versions, and read configuration from the environment.

## Learn

- A **virtual environment** (`python -m venv .venv`) gives a project its own packages. Never install project dependencies into the system Python. [venv](https://docs.python.org/3/library/venv.html)
- **`requirements.txt`** lists exact versions (`fastapi==0.115.14`) so every install matches. Keep test tools in `requirements-dev.txt`, which includes the runtime file with `-r requirements.txt`. `pip freeze` shows what's installed. [Requirements files](https://pip.pypa.io/en/stable/user_guide/#requirements-files)
- **Configuration from environment variables** ([12-factor config](https://12factor.net/config)): the same image runs in dev, test and prod with different settings. Secrets never go in code or images. `pydantic-settings` reads and validates env vars into a typed `Settings` object. [Settings management](https://docs.pydantic.dev/latest/concepts/pydantic_settings/)
- A **Dockerfile** builds an image layer by layer. Copy `requirements.txt` and install *before* copying code, so code changes don't reinstall everything. Run as a non-root user. `.dockerignore` keeps tests, secrets and local databases out. [Dockerfile best practices](https://docs.docker.com/build/building/best-practices/)
- **Docker Compose** starts several containers together (the API and OpenSearch here) and passes env vars between them. Inside Compose, services reach each other by service name (`http://opensearch:9200`).
- **CI** runs the same install and tests on every push. See the `onboarding` job in `.github/workflows/ci.yml` at the repo root.

## Read

Open `catalog/config.py`, `Dockerfile`, `docker-compose.yml` and `.env.example`.

1. Which wins if both `.env` and a real environment variable set `CATALOG_DATABASE_URL`?
2. Why does the Dockerfile set `CATALOG_DATABASE_URL` to a path under `/data`, and what keeps that data when the container is replaced?
3. In Compose, why is the OpenSearch URL `http://opensearch:9200` and not `localhost`?
4. What would break if `requirements.txt` said `fastapi>=0.100` instead of an exact version?

## Do

**1. `CATALOG_LOG_LEVEL`.** Add a `log_level` setting: default `INFO`, case-insensitive (`debug` becomes `DEBUG`), and reject anything other than `DEBUG`, `INFO`, `WARNING`, `ERROR`, `CRITICAL`. Make `create_app` pass it to `configure_logging`. Add it to `.env.example`.

**2. Build and run the image.**

```bash
docker build -t catalog .
docker run --rm -p 8000:8000 -e CATALOG_LOG_LEVEL=debug catalog
```

Open http://localhost:8000/docs and register an item. Stop the container and run it again: the item is gone. Why?

**3. Run the full stack.**

```bash
docker compose up --build
```

Register an item, then `docker compose down` and `docker compose up` again. The item survives this time. Find the line in `docker-compose.yml` that makes the difference.

**4. Clean-room install.** Delete `.venv`, recreate it, install from `requirements-dev.txt`, and run `pytest`. This is what CI does on every push.

## Done when

```bash
pytest exercises/test_m7_config.py
pytest
```

Both pass, and the app runs from `docker compose up`.

## Check yourself

- A teammate hard-codes a database password in `config.py` "just for now". What are two problems, and what's the fix?
- The image is 1 GB and rebuilds take minutes after every code change. What two things do you check first?
- CI passes but the container fails on start. What's different between the two, and how do you find out?
