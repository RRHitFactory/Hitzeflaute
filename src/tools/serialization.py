import json
from abc import ABC, abstractmethod
from dataclasses import dataclass
from enum import Enum
from typing import Protocol, Self, TypeVar, runtime_checkable

from src.tools.typing import IntId, T

type Primitive = int | float | str | bool
type SimpleDict = dict[str, Primitive]
primitives = (int, float, str, bool)


@runtime_checkable
class Serializable(Protocol):
    def to_simple_dict(self) -> SimpleDict: ...

    @classmethod
    def from_simple_dict(cls, simple_dict: SimpleDict) -> Self: ...


@runtime_checkable
class Stringable(Protocol):
    def to_string(self) -> str: ...

    @classmethod
    def from_string(cls, s: str) -> Self: ...


GenericSerializable = TypeVar("GenericSerializable", bound=Serializable)


def serialize(x: Serializable) -> str:
    return json.dumps(x.to_simple_dict())


def deserialize(x: str, cls: type[GenericSerializable]) -> GenericSerializable:
    return cls.from_simple_dict(json.loads(x))


def simplify_type(x: Stringable | Enum | IntId | Primitive) -> Primitive:
    if isinstance(x, Stringable):
        return x.to_string()
    if isinstance(x, Enum):
        return x.value
    if isinstance(x, IntId):
        return x.as_int()
    if any(isinstance(x, p) for p in primitives):
        return x
    raise TypeError(f"Unsupported type {type(x)}")


def simplify_optional_type(
    x: Enum | IntId | Primitive | None,
) -> Primitive | None:
    if x is None:
        return None
    return simplify_type(x)


def un_simplify_type(x: Primitive, t: type[T]) -> T:
    if issubclass(t, Stringable):
        return t.from_string(x)
    if t in primitives:
        return t(x)
    if issubclass(t, Enum):
        return t(x)
    if issubclass(t, IntId):
        return t(x)
    raise TypeError(f"Unsupported type {t}")


def un_simplify_optional_type(x: int | float | str | None, t: type[T]) -> T | None:
    if x is None:
        return None
    return un_simplify_type(x, t)


@dataclass(frozen=True)
class SerializableBase(ABC):
    @abstractmethod
    def to_simple_dict(self) -> SimpleDict:
        pass

    @classmethod
    @abstractmethod
    def from_simple_dict(cls, simple_dict: SimpleDict) -> Self:
        pass
