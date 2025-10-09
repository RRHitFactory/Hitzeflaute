from src.app.simple_front_end.joystick import Joystick
from src.models.message import *  # noqa

if __name__ == "__main__":
    # To play, run this script in the REPL and use the joystick to interact with the game
    j = Joystick.new_game(player_names=["Alice", "Bob"])

    n_rounds = 20
    n_phases = 3
    n_players = 2

    # buy one asset and one transmission line for each player
    j.buy_asset(4)
    j.buy_transmission(4)
    j.change_player()
    j.buy_asset(5)
    j.buy_transmission(5)

    for r in range(n_rounds):
        for ph in range(n_phases):
            if ph == 0:
                print("Start of a new round.")
            for p in range(n_players):
                j.end_turn()
