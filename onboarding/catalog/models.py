"""Pydantic models: the shapes the API accepts and returns.

ItemCreate is what a client sends. Item is what the service returns, with the
server-assigned id and timestamp added.
"""

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator

Kind = Literal["dataset", "service", "document"]


class ItemCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    kind: Kind
    owner: str = Field(min_length=1, max_length=100)
    description: str = ""
    tags: list[str] = Field(default_factory=list, max_length=20)
    metadata: dict[str, Any] = Field(default_factory=dict)

    @field_validator("name", "owner")
    @classmethod
    def strip_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("must not be blank")
        return value

    @field_validator("tags")
    @classmethod
    def normalize_tags(cls, tags: list[str]) -> list[str]:
        # Lowercase, trim, drop duplicates. Tags are a set, so return them sorted:
        # the same order the database gives back.
        cleaned: list[str] = []
        for tag in tags:
            tag = tag.strip().lower()
            if not tag:
                raise ValueError("tags must not be blank")
            if len(tag) > 50:
                raise ValueError(f"tag too long: {tag[:20]}...")
            if tag not in cleaned:
                cleaned.append(tag)
        return sorted(cleaned)

    # Module 1 exercise: add a validator that rejects metadata keys that are not snake_case.


class Item(ItemCreate):
    id: int
    created_at: datetime


class ErrorResponse(BaseModel):
    detail: str
