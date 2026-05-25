from dataclasses import dataclass
from functools import cached_property
from typing import Self

import dataframely as dy
import polars as pl

from src.ids import PlayerId
from src.models.colors import Color
from src.models.data.light_dc import LightDc
from src.models.data.polar_repo import PolarRepo

__all__ = ["Player", "PlayerRepoSchema", "PlayerRepo"]


@dataclass(frozen=True)
class Player(LightDc):
    id: PlayerId
    name: str
    trigram: str
    color: Color
    money: float
    is_having_turn: bool  # Note that multiple players can have turns at the same time
    still_alive: bool = True  # Indicates if the player is still in the game

    @classmethod
    def make_npc(cls) -> "Player":
        return cls(
            id=PlayerId.get_npc(),
            name="NPC",
            trigram="NPC",
            color=Color("black"),
            money=0.0,
            is_having_turn=False,
        )


class PlayerRepoSchema(dy.Schema):
    id = PlayerId._get_dy_column(primary_key=True)
    name = dy.String(max_length=30)
    trigram = dy.String(min_length=3, max_length=3)
    color = dy.String(min_length=7, max_length=8)
    money = dy.Float64()
    is_having_turn = dy.Bool()
    still_alive = dy.Bool()


still_alive = pl.col("still_alive")
is_human = pl.col("id") != int(PlayerId.get_npc())
is_having_turn = pl.col("is_having_turn")


class PlayerRepo(PolarRepo[PlayerRepoSchema, Player, PlayerId]):
    @classmethod
    def get_schema(cls) -> tuple[type[PlayerRepoSchema], type[Player], type[PlayerId]]:
        return PlayerRepoSchema, Player, PlayerId

    # GET
    @cached_property
    def player_ids(self) -> list[PlayerId]:
        return [PlayerId(x) for x in self.df["id"].to_list()]

    @cached_property
    def human_player_ids(self) -> list[PlayerId]:
        return self.only_human.player_ids

    @cached_property
    def alive_human_player_ids(self) -> list[PlayerId]:
        return self.only_alive_human.player_ids

    @property
    def n_human_players(self) -> int:
        return len(self.only_human)

    @property
    def only_alive(self) -> Self:
        return self._filter(still_alive)

    @property
    def only_human(self) -> Self:
        return self._filter(is_human)

    @property
    def human_player_names(self) -> list[str]:
        return self.only_human["name"]

    @property
    def only_alive_human(self) -> Self:
        return self._filter([still_alive, is_human])

    def get_currently_playing(self) -> Self:
        return self._filter(is_having_turn)

    def are_all_players_finished(self) -> bool:
        return len(self.get_currently_playing()) == 0

    def get_money_for_players(self, ids: list[PlayerId]) -> list[float]:
        simple_players = [int(p) for p in ids]
        df = self.df.filter(pl.col("id").is_in(simple_players)).select("id", "money")
        id_moneys: dict[int, float] = {s: m for s, m in zip(df["id"], df["money"])}
        return [id_moneys[s] for s in simple_players]

    # UPDATE
    def add_money(self, player_id: PlayerId, amount: float) -> Self:
        return self.update_key_expressions(id=player_id, key_exprs={"money": pl.col("money") + amount})

    def subtract_money(self, player_id: PlayerId, amount: float) -> Self:
        return self.update_key_expressions(id=player_id, key_exprs={"money": pl.col("money") - amount})

    def transfer_money(self, from_player: PlayerId, to_player: PlayerId, amount: float) -> Self:
        return self.add_money(to_player, amount).subtract_money(from_player, amount)

    def _set_turn(self, player_id: PlayerId | list[PlayerId], is_having_turn: bool) -> Self:
        return self.update_key_values(id=player_id, key_values={"is_having_turn": is_having_turn})

    def end_turn(self, player_id: PlayerId | list[PlayerId]) -> Self:
        return self._set_turn(player_id, False)

    def start_turn(self, player_id: PlayerId) -> Self:
        assert player_id in self.alive_human_player_ids
        return self._set_turn(player_id, True)

    def start_all_turns(self) -> Self:
        return self._set_turn(self.alive_human_player_ids, True)

    def end_all_turns(self) -> Self:
        return self._set_turn(self.human_player_ids, False)

    def start_first_player_turn(self) -> Self:
        players = self.alive_human_player_ids
        mapping = {p: False for p in players}
        mapping[players[0]] = True
        return self.update_with_mapping(key="is_having_turn", mapping=mapping)

    def cycle_turn(self) -> Self:
        current_players = self.get_currently_playing().player_ids
        assert len(current_players) == 1, f"Expected exactly one current player, got {current_players}"
        current_player = current_players[0]

        repo = self.end_turn(current_player)
        human_ids = self.alive_human_player_ids
        next_index = human_ids.index(current_players[0]) + 1
        if next_index >= len(human_ids):
            return repo

        next_player = human_ids[next_index]
        return repo.start_turn(next_player)

    def eliminate_player(self, player_id: PlayerId) -> Self:
        return self.update_key_value(id=player_id, key="still_alive", value=False)

    def eliminate_players(self, player_ids: list[PlayerId]) -> Self:
        return self.update_key_values(id=player_ids, key_values={"still_alive": False})

    # DELETE
    def delete_player(self, player_id: PlayerId) -> Self:
        return self.drop_one(player_id)
