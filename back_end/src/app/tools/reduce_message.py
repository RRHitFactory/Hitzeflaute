from dataclasses import replace
from typing import Protocol, runtime_checkable

import pandas as pd
from back_end.src.models.pending_state import PendingState

from src.engine.finance import FinanceCalculator
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
    Makes the game state more compact before passing to the front end. Also hide the pending state as it is private.
    """
    if game_state.market_coupling_result is None:
        return game_state

    bus_results = {bus: reduce_one_bus(game_state=game_state, coupling_result=game_state.market_coupling_result, bus_id=bus) for bus in game_state.buses.bus_ids}

    line_results = {line: reduce_one_line(game_state=game_state, coupling_result=game_state.market_coupling_result, line_id=line) for line in game_state.transmission.transmission_ids}
    pnl = FinanceCalculator.compute_cashflows_after_power_delivery(game_state=game_state, market_coupling_result=game_state.market_coupling_result)
    market_summary = MarketCouplingSummary(bus_results=bus_results, line_results=line_results, pnl=pnl)
    return replace(game_state, market_summary=market_summary, market_coupling_result=None, pending_state=PendingState())


def reduce_one_line(game_state: GameState, coupling_result: MarketCouplingResult, line_id: TransmissionId) -> pd.DataFrame:
    line = game_state.transmission[line_id]

    flow = float(coupling_result.transmission_flows[line_id].sum())
    b1_price = float(coupling_result.bus_prices.loc[0, line.bus1])  # type: ignore
    b2_price = float(coupling_result.bus_prices.loc[0, line.bus2])  # type: ignore
    if flow >= 0 - 1e-3:
        direction = f"{line.bus1} -> {line.bus2}"
        price_spread = b2_price - b1_price
    else:
        direction = f"{line.bus2} -> {line.bus1}"
        price_spread = b1_price - b2_price

    data = {"line_id": str(line_id), "health": line.health, "capacity": line.capacity, "raw_flow": flow, "flow": abs(flow), "direction": direction, "price_spread": price_spread}
    return pd.Series(data).to_frame(name="")


def reduce_one_bus(game_state: GameState, coupling_result: MarketCouplingResult, bus_id: BusId) -> tuple[float, pd.DataFrame, pd.DataFrame, float]:
    """
    Reduces the game state by removing unnecessary data for a single bus
    """
    bus_assets = game_state.assets.get_all_assets_at_bus(bus_id=bus_id)
    gens = bus_assets.only_generators
    loads = bus_assets.only_loads

    def make_gen_row(asset_id: AssetId) -> dict[str, str | float]:
        asset = gens[asset_id]
        produced_power = coupling_result.assets_dispatch[asset_id].sum()
        return {"asset_id": str(asset_id), "owner_player": str(asset.owner_player), "produced_power": produced_power, "marginal_price": asset.marginal_cost, "bid_price": asset.bid_price}

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

    net_position: float = 0.0
    if len(gen_df) > 0:
        net_position += gen_df["produced_power"].sum()
    if len(load_df) > 0:
        net_position -= load_df["consumed_power"].sum()

    price = coupling_result.bus_prices[bus_id].mean()

    return float(price), gen_df, load_df, float(net_position)
