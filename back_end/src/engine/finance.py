import polars as pl

from src.models.assets import AssetId, AssetRepo
from src.models.buses import BusId
from src.models.game_state import GameState
from src.models.market_coupling_result import MarketCouplingResult
from src.models.pnl import PnlCat, PnlFrame, PnlFrameSchema
from src.models.transmission import TransmissionId, TransmissionRepo


class FinanceCalculator:
    @staticmethod
    def compute_assets_cashflow(
        assets: AssetRepo,
        assets_dispatch: dict[AssetId, float],
        bus_prices: dict[BusId, float],
    ) -> PnlFrame:
        operative_cashflow = 0.0
        market_cashflow = 0.0

        cashflows: list[dict[str, float | PnlCat | int]] = []
        for asset in assets:
            sign = asset.cashflow_sign
            player_id = asset.owner_player

            dispatched_volume = assets_dispatch[asset.id]
            operative_cashflow += -sign * abs(dispatched_volume) * asset.marginal_cost - asset.fixed_operating_cost
            cashflows.append({"cat": "operation", "player_id": player_id.as_int(), "thing_id": asset.id.as_int(), "cashflow": operative_cashflow})

            market_cashflow += sign * abs(dispatched_volume) * bus_prices[asset.bus]
            cashflows.append({"cat": "market", "player_id": player_id.as_int(), "thing_id": asset.id.as_int(), "cashflow": market_cashflow})

        return PnlFrameSchema.validate(pl.DataFrame(cashflows), cast=True)

    @staticmethod
    def compute_transmission_cashflow(
        transmission_repo: TransmissionRepo,
        transmission_flows: dict[TransmissionId, float],
        bus_prices: dict[BusId, float],
    ) -> PnlFrame:
        congestion_payments = 0.0

        cashflows: list[dict[str, float | PnlCat | int]] = []
        for line in transmission_repo:
            player_id = line.owner_player
            volume = transmission_flows[line.id]
            price_spread = bus_prices[line.bus1] - bus_prices[line.bus2]
            congestion_payments += volume * price_spread
            cashflows.append({"cat": "market", "player_id": player_id.as_int(), "thing_id": line.id.as_int(), "cashflow": congestion_payments})

        return PnlFrameSchema.validate(pl.DataFrame(cashflows), cast=True)

    @staticmethod
    def compute_cashflows_after_power_delivery(
        game_state: GameState,
        market_coupling_result: MarketCouplingResult,
    ) -> PnlFrame:
        assets_dispatch: dict[AssetId, float] = market_coupling_result.assets_dispatch.loc[0, :].to_dict()  # type: ignore
        transmission_flows: dict[TransmissionId, float] = market_coupling_result.transmission_flows.loc[0, :].to_dict()  # type: ignore
        bus_prices: dict[BusId, float] = market_coupling_result.bus_prices.loc[0, :].to_dict()  # type: ignore

        asset_cashflows = FinanceCalculator.compute_assets_cashflow(
            assets=game_state.assets,
            assets_dispatch=assets_dispatch,
            bus_prices=bus_prices,
        )
        transmission_cashflows = FinanceCalculator.compute_transmission_cashflow(
            transmission_repo=game_state.transmission,
            transmission_flows=transmission_flows,
            bus_prices=bus_prices,
        )
        total_cashflow = pl.concat([asset_cashflows, transmission_cashflows], how="vertical")
        return PnlFrameSchema.validate(total_cashflow)

    @staticmethod
    def validate_bid_for_asset(
        player_assets: AssetRepo,
        asset_id_to_validate: AssetId,
        bid_to_validate: float,
        player_money: float,
    ) -> bool:
        expected_market_cashflow = 0.0

        for asset in player_assets:
            expected_volume = asset.power_expected
            bid_price = asset.bid_price if asset.id != asset_id_to_validate else bid_to_validate
            sign = asset.cashflow_sign

            # Players must at least be capable of covering the market cashflow of their assets.
            # Operative cashflow is not considered here.
            expected_market_cashflow += sign * bid_price * expected_volume

        delta_money = expected_market_cashflow
        return player_money + delta_money >= 0.0
