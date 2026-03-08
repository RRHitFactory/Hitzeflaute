from typing import Any
from unittest import TestCase


class BaseTest(TestCase):
    def assertIsInstance[T](self, obj: Any, cls: type[T], msg: str | None = None) -> T:  # type: ignore
        # Asserts and returns an object confirmed for the linter
        super().assertIsInstance(obj=obj, cls=cls, msg=msg)
        assert isinstance(obj, cls)
        return obj
