"""Settings read from environment variables (prefix CATALOG_) or a local .env file."""

from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="CATALOG_", env_file=".env", extra="ignore")

    database_url: str = "sqlite:///./catalog.db"
    search_backend: Literal["memory", "opensearch"] = "memory"
    opensearch_url: str = "http://localhost:9200"
    opensearch_index: str = "catalog-items"
    # Module 7 exercise: add log_level here.


@lru_cache
def get_settings() -> Settings:
    return Settings()
