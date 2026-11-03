"""Database access. The rest of the app talks to ItemRepository, never to SQLAlchemy directly."""

from datetime import UTC

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from catalog.db import ItemRow, TagRow
from catalog.models import Item, ItemCreate


class DuplicateItemError(Exception):
    pass


def to_item(row: ItemRow) -> Item:
    created_at = row.created_at
    if created_at.tzinfo is None:
        # SQLite stores no timezone, so values come back naive. They were written in UTC.
        created_at = created_at.replace(tzinfo=UTC)
    return Item(
        id=row.id,
        name=row.name,
        kind=row.kind,
        owner=row.owner,
        description=row.description,
        tags=sorted(tag.name for tag in row.tags),
        metadata=row.meta,
        created_at=created_at,
    )


class ItemRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def _get_or_create_tags(self, names: list[str]) -> list[TagRow]:
        if not names:
            return []
        existing = {t.name: t for t in self.session.scalars(select(TagRow).where(TagRow.name.in_(names)))}
        rows = []
        for name in names:
            if name not in existing:
                existing[name] = TagRow(name=name)
                self.session.add(existing[name])
            rows.append(existing[name])
        return rows

    def add(self, data: ItemCreate) -> Item:
        row = ItemRow(
            name=data.name,
            kind=data.kind,
            owner=data.owner,
            description=data.description,
            meta=data.metadata,
            tags=self._get_or_create_tags(data.tags),
        )
        self.session.add(row)
        try:
            self.session.commit()
        except IntegrityError as exc:
            self.session.rollback()
            raise DuplicateItemError(f"an item named {data.name!r} already exists") from exc
        return to_item(row)

    def get(self, item_id: int) -> Item | None:
        row = self.session.get(ItemRow, item_id)
        return to_item(row) if row else None

    def list_items(self, tag: str | None = None, limit: int = 50, offset: int = 0) -> list[Item]:
        stmt = select(ItemRow).order_by(ItemRow.id).limit(limit).offset(offset)
        if tag:
            stmt = stmt.where(ItemRow.tags.any(TagRow.name == tag.lower()))
        return [to_item(row) for row in self.session.scalars(stmt)]

    def delete(self, item_id: int) -> bool:
        """Delete an item. Return False if it did not exist."""
        row = self.session.get(ItemRow, item_id)
        if row is None:
            return False
        self.session.delete(row)
        self.session.commit()
        return True

    def count_by_tag(self) -> dict[str, int]:
        """Module 4 exercise: return {tag_name: number_of_items}, using one GROUP BY query."""
        raise NotImplementedError("Module 4 exercise")
