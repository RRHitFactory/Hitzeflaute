from dataclasses import replace
from typing import Protocol, runtime_checkable

import pandas as pd

from src.models.game_state import GameState
from src.models.ids import AssetId, BusId, TransmissionId
from src.models.market_coupling_result import MarketCouplingResult, MarketCouplingSummary
from src.models.message import Message


@runtime_checkable
class HasGameState(Protocol):
    game_state: GameState


def reduce_message[T: Message](msg: T) -> T:
    if not isinstance(msg, HasGameState):
        return msg
    return replace(msg, game_state=reduce_game_state(msg.game_state))


def reduce_game_state(game_state: GameState) -> GameState:
    """
    Makes the game state more compact before passing to the front end
    """
    if game_state.market_coupling_result is None:
        return game_state

    bus_results = {bus: reduce_one_bus(game_state=game_state, coupling_result=game_state.market_coupling_result, bus_id=bus) for bus in game_state.buses.bus_ids}

    line_results = {line: reduce_one_line(game_state=game_state, coupling_result=game_state.market_coupling_result, line_id=line) for line in game_state.transmission.transmission_ids}
    market_summary = MarketCouplingSummary(bus_results=bus_results, line_results=line_results)
    return replace(game_state, market_summary=market_summary, market_coupling_result=None)


def reduce_one_line(game_state: GameState, coupling_result: MarketCouplingResult, line_id: TransmissionId) -> pd.DataFrame:
    line = game_state.transmission[line_id]

    data = {
        "line_id": str(line_id),
        "health": line.health,
        "capacity": line.capacity,
        "flow": coupling_result.transmission_flows[line_id].sum(),
        "direction": f"{line.bus1} -> {line.bus2}",
    }
    return pd.Series(data).to_frame(name="")


def reduce_one_bus(game_state: GameState, coupling_result: MarketCouplingResult, bus_id: BusId) -> tuple[float, pd.DataFrame, pd.DataFrame]:
    """
    Reduces the game state by removing unnecessary data for a single bus
    """
    bus_assets = game_state.assets.get_all_assets_at_bus(bus_id=bus_id)
    gens = bus_assets.only_generators
    loads = bus_assets.only_loads

    def make_gen_row(asset_id: AssetId) -> dict[str, str | float]:
        asset = gens[asset_id]
        produced_power = coupling_result.assets_dispatch[asset_id].sum()
        return {
            "asset_id": str(asset_id),
            "owner_player": str(asset.owner_player),
            "produced_power": produced_power,
            "marginal_price": asset.marginal_cost,
            "bid_price": asset.bid_price,
        }

    gen_df = pd.DataFrame([make_gen_row(asset_id) for asset_id in gens.asset_ids])

    def make_load_row(asset_id: AssetId) -> dict[str, str | float]:
        asset = loads[asset_id]
        consumed_power = coupling_result.assets_dispatch[asset_id].sum()
        return {
            "asset_id": str(asset_id),
            "owner_player": str(asset.owner_player),
            "consumed_power": consumed_power,
            "marginal_price": asset.marginal_cost,
            "bid_price": asset.bid_price,
        }

    load_df = pd.DataFrame([make_load_row(asset_id) for asset_id in loads.asset_ids])

    price = coupling_result.bus_prices[bus_id].mean()

    return price, gen_df, load_df
