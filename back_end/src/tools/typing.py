from typing import TypeVar

T = TypeVar("T")
U = TypeVar("U")
V = TypeVar("V")


class IntId(int):
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
