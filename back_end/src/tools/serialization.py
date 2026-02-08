import json
from abc import ABC, abstractmethod
from dataclasses import dataclass
from enum import Enum
from typing import Any, Protocol, Self, get_args, get_origin, runtime_checkable

from src.tools.typing import IntId

type Primitive = int | float | str | bool
type SimpleDict = dict[str, Primitive]
type ComplexDict = dict[str, Primitive | SimpleDict | list[SimpleValue]]
primitives = (int, float, str, bool)


def get_list_inner_type(field_type) -> type | None:
    """
    Extract the inner type from a list annotation using introspection.

    Args:
        field_type: The type annotation of a field

    Returns:
        The inner type if the field is a list, None otherwise

    Examples:
        get_list_inner_type(list[int]) -> int
        get_list_inner_type(List[str]) -> str
        get_list_inner_type(int) -> None
    """
    origin = get_origin(field_type)

    # Check if it's a list type
    if origin is list or (hasattr(origin, "__name__") and origin.__name__ == "list"):
        args = get_args(field_type)
        if args and len(args) == 1:
            return args[0]

    return None


@runtime_checkable
class Serializable(Protocol):
    def to_simple_dict(self) -> SimpleDict | ComplexDict: ...

    @classmethod
    def from_simple_dict(cls, simple_dict: SimpleDict | ComplexDict) -> Self: ...


def serialize(x: Serializable) -> str:
    return json.dumps(x.to_simple_dict())


def deserialize[GenericSerializable: Serializable](x: str, cls: type[GenericSerializable]) -> GenericSerializable:
    return cls.from_simple_dict(json.loads(x))


@runtime_checkable
class Stringable(Protocol):
    def to_string(self) -> str: ...

    @classmethod
    def from_string(cls, s: str) -> Self: ...


type SimpleValue = Stringable | Enum | IntId | Primitive


def simplify_type(x: SimpleValue) -> Primitive:
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
    x: SimpleValue | None,
) -> Primitive | None:
    if x is None:
        return None
    return simplify_type(x)


def un_simplify_type[T: SimpleValue](x: Primitive, t: type[T]) -> T:
    if issubclass(t, Stringable):
        return t.from_string(str(x))
    if t in primitives:
        return t(x)
    if issubclass(t, Enum):
        return t(x)
    if issubclass(t, IntId):
        return t(x)
    raise TypeError(f"Unsupported type {t}")


def un_simplify_optional_type[T: SimpleValue](x: Primitive | None, t: type[T]) -> T | None:
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


@dataclass(frozen=True)
class SerializableDcSimple:
    def to_simple_dict(self) -> SimpleDict:
        return {k: simplify_type(x=self.__getattribute__(k)) for k in self.get_serializable_fields().keys()}

    @classmethod
    def from_simple_dict(cls, simple_dict: SimpleDict) -> Self:
        init_dict = {
            k: un_simplify_type(x=simple_dict[k], t=v.type)
            for k, v in cls.get_serializable_fields().items()  # noqa
        }
        return cls(**init_dict)  # noqa

    @classmethod
    def get_serializable_fields(cls) -> dict[str, type]:
        return {k: v for k, v in cls.__dataclass_fields__.items() if k != "allow_recursion"}


@dataclass(frozen=True)
class SerializableDcRecursive:
    def to_simple_dict(self) -> ComplexDict:
        def serialize_field(x: Serializable | list[Primitive]) -> Primitive | SimpleDict | ComplexDict | list[Primitive]:
            if isinstance(x, Serializable):
                return x.to_simple_dict()
            if isinstance(x, list):
                return [simplify_type(i) for i in x]
            return simplify_type(x)

        return {k: serialize_field(x=self.__getattribute__(k)) for k in self.get_serializable_fields().keys()}  # type: ignore

    @staticmethod
    def process_one(field_value: Any, field_type: type) -> Any:
        def deserialize_dict[T: Serializable](x: SimpleDict | ComplexDict, t: type[T]) -> T:
            return t.from_simple_dict(x)

        def deserialize_value[T: SimpleValue](x: Primitive, t: type[T]) -> T:
            return un_simplify_type(x, t)

        def deserialize_list[T: SimpleValue](x: list[Primitive], t: type[T]) -> list[T]:
            return [un_simplify_type(i, t) for i in x]

        if isinstance(field_value, (int, float, str, bool)):
            return deserialize_value(x=field_value, t=field_type)  # type: ignore

        # Check if the field type is a list
        if isinstance(field_value, list):
            inner_type = get_list_inner_type(field_type)
            assert inner_type is not None, f"Field is a list but inner type could not be determined from {field_type}"
            return deserialize_list(x=field_value, t=inner_type)
        if isinstance(field_type, type) and issubclass(field_type, Serializable) and isinstance(field_value, dict):
            # Handle nested serializable objects
            return deserialize_dict(x=field_value, t=field_type)
        if isinstance(field_type, type):
            # Handle simple values
            return deserialize_value(x=field_value, t=field_type)  # type: ignore

        # Last resort, return the value as is (for complex type annotations we can't do better)
        return field_type(field_value)

    @classmethod
    def from_simple_dict(cls, simple_dict: ComplexDict) -> Self:
        init_dict = {k: cls.process_one(field_value=simple_dict[k], field_type=v) for k, v in cls.get_serializable_fields().items()}  # type: ignore
        return cls(**init_dict)  # noqa

    @classmethod
    def get_serializable_fields(cls) -> dict[str, type[Serializable] | type[SimpleValue | list]]:
        return {k: v.type for k, v in cls.__dataclass_fields__.items()}
