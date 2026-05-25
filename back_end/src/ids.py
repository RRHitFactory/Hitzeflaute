from abc import ABC, abstractmethod
from typing import Any, Self

import dataframely as dy
from dataframely import Column


class IntId(int, ABC):
    @classmethod
    @abstractmethod
    def _get_dy_column_type(cls) -> type[Column]: ...

    @classmethod
    def _get_dy_column(cls, nullable: bool = False, primary_key: bool = False, check: Any | None = None, alias: str | None = None, metadata: dict[str, Any] | None = None) -> Column:
        ct: type[Column] = cls._get_dy_column_type()
        return ct(nullable=nullable, primary_key=primary_key, check=check, alias=alias, metadata=metadata)

    def __str__(self) -> str:
        return str(self.as_int())

    def __repr__(self) -> str:
        return f"{self.__class__.__name__}({self.as_int()})"

    def __hash__(self) -> int:
        return self.as_int()

    def __eq__(self, value: object, /) -> bool:
        if not isinstance(value, IntId):
            return NotImplemented
        if type(self) is not type(value):
            return False
        return int(self) == int(value)

    def as_int(self) -> int:
        return int(self)


class GameId(IntId):
    @classmethod
    def _get_dy_column_type(cls) -> type[Column]:
        return dy.UInt16


class PlayerId(IntId):
    @classmethod
    def _get_dy_column_type(cls) -> type[Column]:
        return dy.Int8

    @property
    def is_npc(self) -> bool:
        return self == self.get_npc()

    @classmethod
    def get_npc(cls) -> Self:  # noqa
        return cls(-1)


class AssetId(IntId):
    @classmethod
    def _get_dy_column_type(cls) -> type[Column]:
        return dy.UInt8


class BusId(IntId):
    @classmethod
    def _get_dy_column_type(cls) -> type[Column]:
        return dy.UInt8


class TransmissionId(IntId):
    @classmethod
    def _get_dy_column_type(cls) -> type[Column]:
        return dy.UInt8


class Round(IntId):
    @classmethod
    def _get_dy_column_type(cls) -> type[Column]:
        return dy.UInt8
