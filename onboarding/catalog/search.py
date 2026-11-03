"""Search backends. Both satisfy SearchBackend, so the service doesn't care which one runs."""

import re
from typing import Protocol

from opensearchpy import OpenSearch

from catalog.config import Settings
from catalog.models import Item
from catalog.transforms import to_search_doc

INDEX_MAPPING = {
    "mappings": {
        "properties": {
            "name": {"type": "text"},
            "description": {"type": "text"},
            "kind": {"type": "keyword"},
            "owner": {"type": "keyword"},
            "tags": {"type": "keyword"},
        }
    }
}


class SearchBackend(Protocol):
    def index(self, item: Item) -> None: ...
    def remove(self, item_id: int) -> None: ...
    def search(self, text: str, tag: str | None = None, limit: int = 10) -> list[int]: ...


def _tokens(text: str) -> set[str]:
    return set(re.findall(r"[a-z0-9]+", text.lower()))


class InMemorySearch:
    """A tiny stand-in for OpenSearch: scores items by how many query words they contain."""

    def __init__(self) -> None:
        self.docs: dict[int, dict] = {}

    def index(self, item: Item) -> None:
        self.docs[item.id] = to_search_doc(item)

    def remove(self, item_id: int) -> None:
        self.docs.pop(item_id, None)

    def search(self, text: str, tag: str | None = None, limit: int = 10) -> list[int]:
        if tag is not None:
            raise NotImplementedError("Module 5 exercise: filter by tag")
        query = _tokens(text)
        scored = []
        for item_id, doc in self.docs.items():
            words = _tokens(f"{doc['name']} {doc['description']} {' '.join(doc['tags'])}")
            score = len(query & words)
            if score:
                scored.append((-score, item_id))
        return [item_id for _, item_id in sorted(scored)[:limit]]


class OpenSearchSearch:
    def __init__(self, client: OpenSearch, index_name: str) -> None:
        self.client = client
        self.index_name = index_name

    def ensure_index(self) -> None:
        if not self.client.indices.exists(index=self.index_name):
            self.client.indices.create(index=self.index_name, body=INDEX_MAPPING)

    def index(self, item: Item) -> None:
        # refresh=True makes the document searchable at once. Fine for a demo; slow at scale.
        self.client.index(index=self.index_name, id=str(item.id), body=to_search_doc(item), refresh=True)

    def remove(self, item_id: int) -> None:
        self.client.delete(index=self.index_name, id=str(item_id), refresh=True, ignore=[404])

    def search(self, text: str, tag: str | None = None, limit: int = 10) -> list[int]:
        query: dict = {"bool": {"must": [{"multi_match": {"query": text, "fields": ["name^2", "description", "tags"]}}]}}
        if tag:
            # filter: must match, but doesn't change the score.
            query["bool"]["filter"] = [{"term": {"tags": tag.lower()}}]
        resp = self.client.search(index=self.index_name, body={"query": query, "size": limit})
        return [int(hit["_id"]) for hit in resp["hits"]["hits"]]


def build_search(settings: Settings) -> SearchBackend:
    if settings.search_backend == "opensearch":
        backend = OpenSearchSearch(OpenSearch(hosts=[settings.opensearch_url]), settings.opensearch_index)
        backend.ensure_index()
        return backend
    return InMemorySearch()
