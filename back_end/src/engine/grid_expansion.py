from src.models.buses import BusSocketManager
from src.models.game_state import GameState
from src.models.ids import AssetId
from src.models.message import (
    AssetBuiltMessage,
    TransmissionBuiltMessage,
)
from src.new_game.generators.generator_maker import GeneratorMaker
from src.new_game.loads.load_maker import LoadMaker
from src.tools.random_choice import sample_boolean


class GridExpansion:
    @classmethod
    def build_grid_elements_for_new_round(cls, game_state: GameState) -> tuple[GameState, list[AssetBuiltMessage | TransmissionBuiltMessage]]:
        new_game_state, build_transmission_msgs = cls.try_build_transmission(game_state)
        new_game_state, build_asset_msgs = cls.try_build_asset(game_state)
        all_msgs = build_transmission_msgs + build_asset_msgs
        return new_game_state, all_msgs

    @classmethod
    def try_build_transmission(cls, game_state: GameState) -> tuple[GameState, list[TransmissionBuiltMessage]]:
        # TODO: implement this method
        return game_state, []

    @classmethod
    def try_build_asset(cls, game_state: GameState, **kwargs) -> tuple[GameState, list[AssetBuiltMessage]]:
        socket_manager = cls._create_asset_socket_manager(game_state)
        want_to_build_asset = sample_boolean(p_true=game_state.game_settings.probability_of_new_asset)

        if not (want_to_build_asset and socket_manager.free_buses):
            return game_state, []

        asset_maker = LoadMaker() if cls._check_system_adequacy(game_state) else GeneratorMaker()

        new_asset = asset_maker.make_one(asset_id=AssetId(game_state.assets.next_id()), bus_id=socket_manager.get_bus_with_free_socket(use=True), current_round=game_state.game_round, **kwargs)
        new_game_state = game_state.update(game_state.assets + new_asset)

        msgs = [
            AssetBuiltMessage(
                game_id=game_state.game_id,
                player_id=player.id,
                message=f"New {new_asset.technology} {new_asset.asset_type} built at bus {new_asset.bus}.",
                asset_id=new_asset.id,
            )
            for player in game_state.players.human_players
        ]
        return new_game_state, msgs

    @classmethod
    def _check_system_adequacy(cls, game_state: GameState) -> bool:
        assets = game_state.assets
        return assets.get_total_generation_capacity() >= assets.get_total_consumption_capacity()

    @classmethod
    def _create_asset_socket_manager(cls, game_state: GameState) -> BusSocketManager:
        available_bus_sockets = {bus.id: bus.max_assets - len(game_state.assets.get_all_assets_at_bus(bus.id)) for bus in game_state.buses}
        return BusSocketManager(starting_sockets=available_bus_sockets)

    @classmethod
    def _create_transmission_socket_manager(cls, game_state: GameState) -> BusSocketManager:
        available_bus_sockets = {bus.id: bus.max_lines - len(game_state.transmission.get_all_at_bus(bus.id)) for bus in game_state.buses}
        return BusSocketManager(starting_sockets=available_bus_sockets)
