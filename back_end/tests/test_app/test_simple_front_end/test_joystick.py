from src.app.simple_front_end.joystick import Joystick
from tests.base_test import BaseTest


class TestJoystick(BaseTest):
    def test_joystick(self) -> None:
        joystick = Joystick.new_game(player_names=["Alice", "Bob"])
        joystick.end_turn()
        joystick.end_turn()
