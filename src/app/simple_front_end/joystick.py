from typing import Optional

from src.app.game_manager import GameManager
from src.app.game_repo.file_game_repo import FileGameStateRepo
from src.app.simple_front_end.plotting.grid_plotter import GridPlotter
from src.directories import game_cache_dir
from src.engine.engine import Engine
from src.models.game_state import GameState
from src.models.ids import GameId, PlayerId, AssetId, TransmissionId
from src.models.message import (
    GameToPlayerMessage,
    PlayerToGameMessage,
    BuyRequest,
    EndTurn,
    UpdateBidRequest,
    OperateLineRequest,
)
from src.tools.random_choice import random_choice


class MessageHandler:
    def __init__(self, joystick: "Joystick") -> None:
        self._received_msgs: list[GameToPlayerMessage] = []
        self._joystick = joystick

    @property
    def last_msg(self) -> Optional[GameToPlayerMessage]:
        if not self._received_msgs:
            return None
        return self._received_msgs[-1]

    @property
    def last_state_update(self) -> Optional[GameState]:
        last_msg = self.last_msg
        if last_msg is None:
            return None
        return last_msg.game_state

    def handle_player_messages(self, msgs: list[GameToPlayerMessage]) -> None:
        print(f"Received {len(msgs)} messages")
        for msg in msgs:
            print(msg)
            self._received_msgs.append(msg)
        self._joystick.on_receive_message(latest_state=self.last_state_update)


class Joystick:
    def __init__(self, game_id: GameId) -> None:
        self._message_handler = MessageHandler(joystick=self)
        self._plotter = GridPlotter(html_path=game_cache_dir / "plot.html")
        self._game_manager = GameManager(
            game_repo=self.get_game_repo(), game_engine=Engine(), front_end=self._message_handler
        )
        self._game_id = game_id
        self._current_player_id = PlayerId.get_npc()
        self.change_player()
        self._plotter.plot(self.latest_game_state)

    def __str__(self) -> str:
        return (
            f"<Joystick (phase: {self.current_phase}, current_player={self.current_player}, game_id={self._game_id})>"
        )

    def __repr__(self) -> str:
        return str(self)

    @property
    def current_phase(self) -> str:
        return self.latest_game_state.phase.name

    @property
    def current_player(self) -> str:
        return self.latest_game_state.players[self._current_player_id].name

    @property
    def latest_game_state(self) -> GameState:
        return self._game_manager.game_repo.get_game_state(game_id=self._game_id)

    def on_receive_message(self, latest_state: GameState) -> None:
        self._plotter.plot(latest_state)

    def whats_up(self) -> None:
        print(f"Current phase: {self.current_phase}")
        print(f"Current player: {self.current_player}")

    def plot_network(self) -> None:
        GridPlotter().plot(self.latest_game_state)

    def change_player(self) -> None:
        active_players = self.latest_game_state.players.get_currently_playing().as_objs()
        player_ids = [p.id for p in active_players if p.id not in [self._current_player_id, PlayerId.get_npc()]]
        if len(player_ids) == 0:
            self._current_player_id = PlayerId.get_npc()
        else:
            self._current_player_id = random_choice(player_ids)
        print(f"Now it is {self.current_player}'s turn")

    def buy_asset(self, asset_id: int) -> None:
        message = BuyRequest(player_id=self._current_player_id, purchase_id=AssetId(asset_id))
        self._send_message(message)

    def buy_transmission(self, transmission_id: int) -> None:
        message = BuyRequest(player_id=self._current_player_id, purchase_id=TransmissionId(transmission_id))
        self._send_message(message)

    def open_line(self, transmission_id: int) -> None:
        t_id = TransmissionId(transmission_id)
        message = OperateLineRequest(player_id=self._current_player_id, transmission_id=t_id, action="open")
        self._send_message(message)

    def close_line(self, transmission_id: int) -> None:
        t_id = TransmissionId(transmission_id)
        message = OperateLineRequest(player_id=self._current_player_id, transmission_id=t_id, action="close")
        self._send_message(message)

    def update_bid(self, asset_id: int, new_bid: float) -> None:
        message = UpdateBidRequest(player_id=self._current_player_id, asset_id=AssetId(asset_id), bid_price=new_bid)
        self._send_message(message)

    def end_turn(self) -> None:
        message = EndTurn(player_id=self._current_player_id)
        self._send_message(message)
        self.change_player()

    def _send_message(self, message: PlayerToGameMessage) -> None:
        self._game_manager.handle_player_message(game_id=self._game_id, msg=message)

    @classmethod
    def get_game_repo(cls) -> FileGameStateRepo:
        return FileGameStateRepo()

    @classmethod
    def new_game(cls, player_names: list[str]) -> "Joystick":
        game_id = GameManager.new_game(game_repo=cls.get_game_repo(), player_names=player_names)
        return cls(game_id=game_id)
