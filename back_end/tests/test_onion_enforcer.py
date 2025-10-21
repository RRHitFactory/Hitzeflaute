from back_end.tests.base_test import BaseTest

from src.onion_enforcer import check_repo  # noqa


class TestOnionEnforcer(BaseTest):
    def test_onion_enforcer(self) -> None:
        check_repo()
