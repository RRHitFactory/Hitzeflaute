from src.app.simple_front_end.joystick import Joystick
from src.models.message import *  # noqa

if __name__ == "__main__":
    # To play, run this script in the REPL and use the joystick to interact with the game
    j = Joystick.new_game(player_names=["Alice", "Bob"])

    n_rounds = 20
    n_phases = 3
    n_players = 2
    for _ in range(n_rounds):
        for _ in range(n_phases):
            for _ in range(n_players):
                j.end_turn()
