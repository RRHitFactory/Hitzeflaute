from typing import Any, TypeVar
from unittest import TestCase

T = TypeVar("T")


class BaseTest(TestCase):
    def assertIsInstance(self, obj: Any, cls: type[T], msg: str | None = None) -> T:
        # Asserts and returns an object confirmed for the linter
        super().assertIsInstance(obj=obj, cls=cls, msg=msg)
        assert isinstance(obj, cls)
        return obj
