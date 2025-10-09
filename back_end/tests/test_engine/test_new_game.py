from unittest import TestCase

from src.engine.new_game import DefaultGameInitializer
from src.models.assets import AssetRepo, AssetInfo
from src.models.buses import BusRepo, Bus
from src.models.game_settings import GameSettings
from src.models.game_state import GameState
from src.models.ids import GameId, PlayerId
from src.models.transmission import TransmissionRepo


class TestDefaultGameInitializer(TestCase):
    def setUp(self) -> None:
        self.game_id = GameId(1)
        self.player_names = ["Alice", "Bob", "Charlie"]
        self.settings = GameSettings(n_buses=10)

    def test_create_new_game(self) -> None:
        game_initializer = DefaultGameInitializer(settings=self.settings)
        game_state = game_initializer.create_new_game(game_id=self.game_id, player_names=self.player_names)

        self.assertIsInstance(game_state, GameState)
        self.assertEqual(game_state.game_id, self.game_id)
        self.assertEqual(len(game_state.players), len(self.player_names) + 1)
        for i, player_name in enumerate(self.player_names):
            player = game_state.players[PlayerId(i + 1)]
            self.assertEqual(player.name, player_name)
            self.assertEqual(player.money, 1000)  # Default money
            self.assertTrue(player.is_having_turn)

        self.assertIsInstance(game_state.assets, AssetRepo)
        self.assertIsInstance(game_state.buses, BusRepo)
        self.assertIsInstance(game_state.transmission, TransmissionRepo)

        # check that settings are applied correctly
        self.assertEqual(len(game_state.buses), self.settings.n_buses)

        # check that every player owns a freezer
        for player_id in game_state.players.human_player_ids:
            freezer = game_state.assets.get_freezer_for_player(player_id=player_id)
            self.assertIsInstance(freezer, AssetInfo)
            self.assertTrue(freezer.is_freezer)

        # check that all buses are connected
        for bus_id in game_state.buses.bus_ids:
            bus = game_state.buses[bus_id]
            self.assertIsInstance(bus, Bus)
            self.assertGreater(
                len(game_state.transmission.get_all_at_bus(bus_id)),
                0,
                f"Bus {bus_id} should be connected",
            )
