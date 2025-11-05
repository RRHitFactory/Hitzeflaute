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

    def __eq__(self, other: "IntId") -> bool:
        if not isinstance(other, IntId):
            return NotImplemented
        if type(self) is not type(other):
            return False
        return int(self) == int(other)

    def as_int(self) -> int:
        return int(self)


a = 2
