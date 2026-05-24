from src.models.assets import AssetInfo, AssetRepo
from src.models.buses import Bus, BusRepo
from src.models.game_settings import GameSettings
from src.models.game_state import GameState
from src.models.ids import GameId, PlayerId
from src.models.transmission import TransmissionRepo
from src.new_game.new_game import GameInitializer
from src.new_game.trigram_maker import make_trigrams
from tests.base_test import BaseTest


def get_cartesian_product_of_topologies():
    bus_topologies = ["line", "grid", "random", "regular_polygon", "layered_polygon"]
    transmission_topologies = ["sequential", "random", "grid", "spiderweb"]
    return [(bt, tt) for bt in bus_topologies for tt in transmission_topologies]


class TestGameInitializer(BaseTest):
    def setUp(self) -> None:
        self.game_id = GameId(1)
        self.player_names = ["Alice", "Bob", "Charlie"]
        self.settings = GameSettings(n_buses=10)

    def test_create_new_game(self) -> None:
        game_initializer = GameInitializer(settings=self.settings)
        game_state = game_initializer.create_new_game(game_id=self.game_id, player_names=self.player_names)

        self.assertIsInstance(game_state, GameState)
        self.assertEqual(game_state.game_id, self.game_id)
        self.assertEqual(len(game_state.players), len(self.player_names) + 1)
        for i, player_name in enumerate(self.player_names):
            player = game_state.players[PlayerId(i + 1)]
            self.assertEqual(player.name, player_name)
            self.assertEqual(player.money, 10000)  # Default money
        n_playing = sum([1 for p in game_state.players.human_players if p.is_having_turn])
        self.assertEqual(n_playing, 1)  # Only one player should have the turn

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

    def _change_settings(self, **kwargs) -> GameSettings:
        settings_dict = self.settings.to_simple_dict()
        settings_dict.update(kwargs)
        return GameSettings.from_simple_dict(settings_dict)

    def test_create_new_game_with_custom_topologies(self):
        for bus_topo, transmission_topo in get_cartesian_product_of_topologies():
            custom_settings = self._change_settings(bus_topology=bus_topo, transmission_topology=transmission_topo)
            game_initializer = GameInitializer(settings=custom_settings)
            try:
                gs = game_initializer.create_new_game(game_id=self.game_id, player_names=self.player_names)
                self.assertEqual(len(gs.buses), custom_settings.n_buses)
            except Exception:
                self.assertTrue(False, f"Failed to create game with bus topology {bus_topo} and transmission topology {transmission_topo}")

    def test_trigram(self) -> None:
        names = ["Sergio Zambrano", "Roman Cantu", "Giancarlo Marzano", "Alberte Bouso", "Robbie Muir"]
        trigrams = make_trigrams(names)
        self.assertEqual(trigrams, ["SZA", "RCA", "GMA", "ABO", "RMU"])
