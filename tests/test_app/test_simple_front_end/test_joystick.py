from unittest import TestCase

from src.app.simple_front_end.joystick import Joystick


class TestJoystick(TestCase):
    def test_joystick(self) -> None:
        joystick = Joystick.new_game(player_names=["Alice", "Bob"])
        joystick.end_turn()
        joystick.end_turn()
