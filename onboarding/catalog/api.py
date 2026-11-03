"""HTTP layer. Run with: uvicorn catalog.api:create_app --factory --reload

Interactive docs at /docs; the OpenAPI spec at /openapi.json.
"""

from collections.abc import Iterator

from fastapi import Depends, FastAPI, Query, Request
from fastapi.responses import JSONResponse

from catalog.config import Settings, get_settings
from catalog.db import init_db, make_engine, make_session_factory
from catalog.logging_setup import configure_logging
from catalog.models import ErrorResponse, Item, ItemCreate
from catalog.repository import DuplicateItemError, ItemRepository
from catalog.search import SearchBackend, build_search
from catalog.service import CatalogService, ItemNotFoundError


def get_service(request: Request) -> Iterator[CatalogService]:
    # One database session per request, closed when the response is sent.
    with request.app.state.session_factory() as session:
        yield CatalogService(ItemRepository(session), request.app.state.search)


def create_app(settings: Settings | None = None, search: SearchBackend | None = None) -> FastAPI:
    settings = settings or get_settings()
    configure_logging()

    engine = make_engine(settings.database_url)
    init_db(engine)

    app = FastAPI(
        title="Catalog Service",
        version="0.1.0",
        description="Register objects, tag them with metadata, and search them.",
    )
    app.state.session_factory = make_session_factory(engine)
    app.state.search = search if search is not None else build_search(settings)

    @app.exception_handler(ItemNotFoundError)
    def not_found(_: Request, exc: ItemNotFoundError) -> JSONResponse:
        return JSONResponse(status_code=404, content={"detail": str(exc)})

    @app.exception_handler(DuplicateItemError)
    def duplicate(_: Request, exc: DuplicateItemError) -> JSONResponse:
        return JSONResponse(status_code=409, content={"detail": str(exc)})

    # Module 2 exercise: add a RequestValidationError handler here.

    @app.get("/health", tags=["ops"])
    def health() -> dict[str, str]:
        return {"status": "ok"}

    @app.post("/items", status_code=201, tags=["items"], responses={409: {"model": ErrorResponse}})
    def register_item(data: ItemCreate, service: CatalogService = Depends(get_service)) -> Item:
        """Register a new object in the catalog."""
        return service.register(data)

    @app.get("/items/{item_id}", tags=["items"], responses={404: {"model": ErrorResponse}})
    def get_item(item_id: int, service: CatalogService = Depends(get_service)) -> Item:
        return service.get(item_id)

    @app.get("/items", tags=["items"])
    def list_items(
        tag: str | None = None,
        limit: int = Query(50, ge=1, le=100),
        offset: int = Query(0, ge=0),
        service: CatalogService = Depends(get_service),
    ) -> list[Item]:
        return service.list_items(tag=tag, limit=limit, offset=offset)

    # Module 2 exercise: add DELETE /items/{item_id}.
    # Module 4 exercise: add GET /tags.

    @app.get("/search", tags=["search"])
    def search_items(
        q: str = Query(min_length=1),
        tag: str | None = None,
        limit: int = Query(10, ge=1, le=50),
        service: CatalogService = Depends(get_service),
    ) -> list[Item]:
        """Full-text search over name, description and tags."""
        return service.search(q, tag=tag, limit=limit)

    return app
