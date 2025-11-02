from collections.abc import Callable
from dataclasses import dataclass
from functools import cached_property
from typing import Self

from src.models.colors import Color
from src.models.data.ldc_repo import LdcRepo
from src.models.data.light_dc import LightDc
from src.models.ids import PlayerId


@dataclass(frozen=True)
class Player(LightDc):
    id: PlayerId
    name: str
    color: Color
    money: float
    is_having_turn: bool  # Note that multiple players can have turns at the same time
    still_alive: bool = True  # Indicates if the player is still in the game

    @classmethod
    def make_npc(cls) -> "Player":
        return cls(
            id=PlayerId.get_npc(),
            name="NPC",
            color=Color("black"),
            money=0.0,
            is_having_turn=False,
        )


class PlayerRepo(LdcRepo[Player]):
    @classmethod
    def _get_dc_type(cls) -> type[Player]:
        return Player

    # GET
    @property
    def player_ids(self) -> list[PlayerId]:
        return [PlayerId(x) for x in self.df.index.tolist()]

    @cached_property
    def human_players(self) -> list[Player]:
        return [self[p] for p in self.human_player_ids]

    @cached_property
    def human_player_ids(self) -> list[PlayerId]:
        return [p for p in self.player_ids if p != PlayerId.get_npc()]

    @cached_property
    def n_human_players(self) -> int:
        return len(self.human_players)

    @property
    def only_alive(self) -> Self:
        return self._filter({"still_alive": True})

    def get_player(self, player_id: PlayerId) -> Player:
        return self[player_id]

    def get_currently_playing(self) -> Self:
        return self._filter(condition={"is_having_turn": True})

    def are_all_players_finished(self) -> bool:
        return len(self.get_currently_playing()) == 0

    # UPDATE
    def _adjust_money(self, player_id: PlayerId, func: Callable[[float], float]) -> Self:
        df = self.df.copy()
        df.loc[player_id, "money"] = func(df.loc[player_id, "money"])
        return self.update_frame(df)

    def add_money(self, player_id: PlayerId, amount: float) -> Self:
        return self._adjust_money(player_id, lambda x: x + amount)

    def subtract_money(self, player_id: PlayerId, amount: float) -> Self:
        return self._adjust_money(player_id, lambda x: x - amount)

    def transfer_money(self, from_player: PlayerId, to_player: PlayerId, amount: float) -> Self:
        return self.add_money(to_player, amount).subtract_money(from_player, amount)

    def _set_turn(self, player_id: PlayerId | list[PlayerId], is_having_turn: bool) -> Self:
        df = self.df.copy()
        df.loc[player_id, "is_having_turn"] = is_having_turn
        return self.update_frame(df)

    def end_turn(self, player_id: PlayerId | list[PlayerId]) -> Self:
        return self._set_turn(player_id, False)

    def start_turn(self, player_id: PlayerId | list[PlayerId]) -> Self:
        return self._set_turn(player_id, True)

    def start_all_turns(self) -> Self:
        return self._set_turn(self.human_player_ids, True)

    def start_first_player_turn(self) -> Self:
        df = self.df.copy()
        df.loc[:, "is_having_turn"] = False
        df.loc[self.human_player_ids[0], "is_having_turn"] = True
        return self.update_frame(df)

    def cycle_turn(self) -> Self:
        current_players = self.get_currently_playing().player_ids
        assert len(current_players) == 1, f"Expected exactly one current player, got {current_players}"
        current_player = current_players[0]

        df = self.df.copy()
        df.loc[current_player, "is_having_turn"] = False
        human_ids = self.human_player_ids
        next_index = human_ids.index(current_players[0]) + 1
        if next_index >= len(human_ids):
            return self.update_frame(df)

        next_player = human_ids[next_index]
        df.loc[next_player, "is_having_turn"] = True
        return self.update_frame(df)

    def eliminate_player(self, player_id: PlayerId) -> Self:
        df = self.df.copy()
        df.loc[player_id, "still_alive"] = False
        return self.update_frame(df)

    # DELETE
    def delete_player(self, player_id: PlayerId) -> Self:
        return self.drop_one(player_id)
