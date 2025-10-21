from src.onion_enforcer import check_repo  # noqa
from tests.base_test import BaseTest


class TestOnionEnforcer(BaseTest):
    def test_onion_enforcer(self) -> None:
        check_repo()
