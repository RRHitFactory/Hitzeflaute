from back_end.tests.base_test import BaseTest

from src.models.game_state import GameState
from src.tools.serialization import deserialize, serialize
from tests.utils.comparisons import assert_game_states_are_equal
from tests.utils.game_state_maker import GameStateMaker


class TestGameState(BaseTest):
    def test_make_random_game_state(self) -> None:
        GameStateMaker().make()

    def test_serialization(self) -> None:
        # Test the serialization of the GameState object
        game_state = GameStateMaker().make()
        json_str = serialize(game_state)
        re_built_state = deserialize(x=json_str, cls=GameState)

        assert_game_states_are_equal(game_state1=game_state, game_state2=re_built_state)

    def test_update(self):
        # Test the update method of GameState
        game_state_1 = GameStateMaker().make()
        game_state_2 = GameStateMaker().make()

        dict_vars = dict(vars(game_state_1))

        game_state_2 = game_state_2.update(**dict_vars)
        self.assertEqual(game_state_1, game_state_2)

        dict_vars_incorrect = {**dict_vars, "hello": "world"}
        with self.assertRaises(
            AssertionError,
            msg="GameState.update() should not accept keys not in the GameState attributes.",
        ):
            game_state_2.update(**dict_vars_incorrect)

        repeated_attributes = [dict_vars["players"], dict_vars["players"]]
        with self.assertRaises(
            ValueError,
            msg="GameState.update() should not accept repeated attributes as arguments.",
        ):
            game_state_2.update(*repeated_attributes)
