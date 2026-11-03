"""Business rules. The database is the source of truth; the search index is a copy."""

import logging

from catalog.models import Item, ItemCreate
from catalog.repository import ItemRepository
from catalog.search import SearchBackend

log = logging.getLogger(__name__)


class ItemNotFoundError(Exception):
    def __init__(self, item_id: int) -> None:
        super().__init__(f"item {item_id} not found")
        self.item_id = item_id


class CatalogService:
    def __init__(self, repo: ItemRepository, search: SearchBackend) -> None:
        self.repo = repo
        self.search_backend = search

    def register(self, data: ItemCreate) -> Item:
        item = self.repo.add(data)
        try:
            self.search_backend.index(item)
        except Exception:
            # The item is saved, so don't fail the request. Log it so the index can be rebuilt.
            log.exception("indexing failed for item %s", item.id)
        log.info("registered item %s (%s)", item.id, item.name)
        return item

    def get(self, item_id: int) -> Item:
        item = self.repo.get(item_id)
        if item is None:
            raise ItemNotFoundError(item_id)
        return item

    def list_items(self, tag: str | None, limit: int, offset: int) -> list[Item]:
        return self.repo.list_items(tag=tag, limit=limit, offset=offset)

    def delete(self, item_id: int) -> None:
        if not self.repo.delete(item_id):
            raise ItemNotFoundError(item_id)
        try:
            self.search_backend.remove(item_id)
        except Exception:
            # The row is gone; a stale index entry is skipped by search() until the index is rebuilt.
            log.exception("removing item %s from search failed", item_id)
        log.info("deleted item %s", item_id)

    def search(self, text: str, tag: str | None = None, limit: int = 10) -> list[Item]:
        ids = self.search_backend.search(text, tag=tag, limit=limit)
        # The index can lag behind the database; skip ids that no longer exist.
        return self.repo.get_many(ids)
