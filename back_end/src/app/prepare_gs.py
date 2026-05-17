import pandas as pd

from src.engine.finance import FinanceCalculator
from src.engine.referee import Referee
from src.models.game_state import GameState
from src.models.ids import AssetId, BusId, TransmissionId
from src.models.market_coupling_result import MarketCouplingResult, MarketCouplingSummary
from src.tools.serialization import SimpleDict


def prepare_game_state_for_front_end(game_state: GameState) -> SimpleDict:
    """
    Makes the game state more compact before passing to the front end. Also hide the pending state as it is private.
    """
    gs_dict = game_state.to_simple_dict()
    gs_dict["market_coupling_result"] = None
    gs_dict["pending_state"] = None
    loser = Referee.get_losing_player(gs=game_state)
    gs_dict["losing_player"] = int(loser)

    if game_state.market_coupling_result is not None:
        bus_results = {bus: reduce_one_bus(game_state=game_state, coupling_result=game_state.market_coupling_result, bus_id=bus) for bus in game_state.buses.bus_ids}

        line_results = {line: reduce_one_line(game_state=game_state, coupling_result=game_state.market_coupling_result, line_id=line) for line in game_state.transmission.transmission_ids}
        pnl = FinanceCalculator.compute_cashflows_after_power_delivery(game_state=game_state, market_coupling_result=game_state.market_coupling_result)
        market_summary = MarketCouplingSummary(bus_results=bus_results, line_results=line_results, pnl=pnl)
        gs_dict["market_summary"] = market_summary.to_simple_dict()

    return gs_dict


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
    bus_asset_ids = coupling_result.assets_locations.get(bus_id, [])
    assets = game_state.assets.get_multiple(bus_asset_ids)
    gens = assets.only_generators
    loads = assets.only_loads

    total_dispatch_dict: dict[int, float] = coupling_result.assets_dispatch.sum().to_dict()  # type: ignore
    dispatch_dict: dict[AssetId, float] = {AssetId(k): v for k, v in total_dispatch_dict.items()}

    def make_gen_row(asset_id: AssetId) -> dict[str, str | float]:
        asset = gens[asset_id]
        produced_power = dispatch_dict.get(asset_id, 0.0)
        return {"asset_id": str(asset_id), "owner_player": str(asset.owner_player), "produced_power": produced_power, "marginal_price": asset.marginal_cost, "bid_price": asset.bid_price}

    gen_df = pd.DataFrame([make_gen_row(asset_id) for asset_id in gens.asset_ids])

    def make_load_row(asset_id: AssetId) -> dict[str, str | float]:
        asset = loads[asset_id]
        consumed_power = dispatch_dict.get(asset_id, 0.0)
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
