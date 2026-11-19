"""Building blocks for API contracts.

Contracts are Pydantic models in `app/contracts/`: the single source of truth for every request and
response shape. `scripts/gen_contracts.py` turns them into zod schemas in `packages/shared` for the web app,
and `./verify --quick` fails if that file is out of date.

- JSON field names are camelCase (`created_at` in Python is `createdAt` on the wire).
- Use `Email` and `Annotated[str, Text(...)]` for user input: their error messages are what the user sees,
  and the generator copies them into the zod schemas so the web forms show the same words.
"""

import re
from dataclasses import dataclass
from typing import Annotated, Any, LiteralString, cast

from pydantic import (
    AfterValidator,
    BaseModel,
    BeforeValidator,
    ConfigDict,
    Field,
    GetCoreSchemaHandler,
    GetJsonSchemaHandler,
)
from pydantic.alias_generators import to_camel
from pydantic.json_schema import JsonSchemaValue
from pydantic_core import CoreSchema, PydanticCustomError, core_schema


class Contract(BaseModel):
    """Base class for every contract: camelCase JSON, unknown fields ignored, never mutated."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, frozen=True, extra="ignore")


EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
EMAIL_MESSAGE = "Enter a valid email address"


def _normalise_email(value: object) -> object:
    return value.strip().lower() if isinstance(value, str) else value


def _check_email(value: str) -> str:
    if len(value) > 254 or not EMAIL_RE.match(value):
        raise PydanticCustomError("email", EMAIL_MESSAGE)
    return value


# Trimmed and lower-cased, then checked. The x- keys tell the zod generator to do the same.
Email = Annotated[
    str,
    BeforeValidator(_normalise_email),
    AfterValidator(_check_email),
    Field(
        json_schema_extra={
            "format": "email",
            "maxLength": 254,
            "x-transform": ["trim", "lower"],
            "x-messages": {"format": EMAIL_MESSAGE},
        }
    ),
]


@dataclass(frozen=True)
class Text:
    """Length limits for a string, with the messages users see when they break them.

    `password: Annotated[str, Text(8, 128, too_short="Password must be at least 8 characters")]`
    """

    min_length: int = 0
    max_length: int | None = None
    too_short: str | None = None
    too_long: str | None = None
    trim: bool = False

    @property
    def short_message(self) -> str:
        return self.too_short or f"Must be at least {self.min_length} characters"

    @property
    def long_message(self) -> str:
        return self.too_long or f"Must be at most {self.max_length} characters"

    def _check(self, value: str) -> str:
        if self.trim:
            value = value.strip()
        if len(value) < self.min_length:
            raise PydanticCustomError("too_short", cast(LiteralString, self.short_message))
        if self.max_length is not None and len(value) > self.max_length:
            raise PydanticCustomError("too_long", cast(LiteralString, self.long_message))
        return value

    def __get_pydantic_core_schema__(self, source: Any, handler: GetCoreSchemaHandler) -> CoreSchema:
        return core_schema.no_info_after_validator_function(self._check, handler(source))

    def __get_pydantic_json_schema__(self, schema: CoreSchema, handler: GetJsonSchemaHandler) -> JsonSchemaValue:
        out = handler(schema)
        out["minLength"] = self.min_length
        if self.max_length is not None:
            out["maxLength"] = self.max_length
        out["x-messages"] = {"min": self.short_message, "max": self.long_message}
        if self.trim:
            out["x-transform"] = ["trim"]
        return out
