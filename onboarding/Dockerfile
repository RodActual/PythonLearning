FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Install dependencies first so this layer is cached until requirements.txt changes.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY catalog ./catalog

RUN useradd --create-home app && mkdir -p /data && chown app /data
USER app

ENV CATALOG_DATABASE_URL=sqlite:////data/catalog.db
EXPOSE 8000
CMD ["uvicorn", "catalog.api:create_app", "--factory", "--host", "0.0.0.0", "--port", "8000"]
