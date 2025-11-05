from dataclasses import dataclass
from typing import Self, TypeVar

from src.tools.serialization import SerializableDcSimple, SimpleDict, simplify_type, un_simplify_type


@dataclass(frozen=True)
class LightDc(SerializableDcSimple):
    # An id-indexed light-weight dataclass with no complex types. It can easily be turned into a row of a dataframe
    id: int

    def to_simple_dict(self) -> SimpleDict:
        return {k: simplify_type(x=self.__getattribute__(k)) for k in self.get_serializable_fields().keys()}

    @classmethod
    def get_keys(cls) -> list[str]:
        return list(cls.get_serializable_fields().keys())

    @classmethod
    def from_simple_dict(cls, simple_dict: SimpleDict) -> Self:
        init_dict = {k: un_simplify_type(x=simple_dict[k], t=v.type) for k, v in cls.get_serializable_fields().items()}
        return cls(**init_dict)  # noqa


T_LightDc = TypeVar("T_LightDc", bound=LightDc)
