from src.models.assets import AssetId, AssetRepo
from src.models.buses import BusId
from src.models.game_state import GameState
from src.models.ids import PlayerId
from src.models.market_coupling_result import MarketCouplingResult
from src.models.transmission import TransmissionId, TransmissionRepo


class NetCashflow(float): ...  # This is a simple wrapper around float to represent net cashflow


class FinanceCalculator:
    @staticmethod
    def compute_assets_cashflow(
        assets: AssetRepo,
        assets_dispatch: dict[AssetId, float],
        bus_prices: dict[BusId, float],
    ) -> NetCashflow:
        operative_cashflow = 0.0
        market_cashflow = 0.0

        for asset in assets:
            sign = asset.cashflow_sign
            dispatched_volume = assets_dispatch[asset.id]
            operative_cashflow += -sign * abs(dispatched_volume) * asset.marginal_cost - asset.fixed_operating_cost
            market_cashflow += sign * abs(dispatched_volume) * bus_prices[asset.bus]

        return NetCashflow(market_cashflow + operative_cashflow)

    @staticmethod
    def compute_transmission_cashflow(
        transmission_repo: TransmissionRepo,
        transmission_flows: dict[TransmissionId, float],
        bus_prices: dict[BusId, float],
    ) -> NetCashflow:
        congestion_payments = 0.0

        for line in transmission_repo:
            volume = transmission_flows[line.id]
            price_spread = bus_prices[line.bus1] - bus_prices[line.bus2]
            congestion_payments += volume * price_spread

        return NetCashflow(congestion_payments)

    @staticmethod
    def compute_cashflows_after_power_delivery(
        game_state: GameState,
        market_coupling_result: MarketCouplingResult,
    ) -> dict[PlayerId, NetCashflow]:
        # TODO: Modify to handle multiple timesteps in the future
        assets_dispatch: dict[AssetId, float] = market_coupling_result.assets_dispatch.loc[0, :].to_dict()
        transmission_flows: dict[TransmissionId, float] = market_coupling_result.transmission_flows.loc[0, :].to_dict()
        bus_prices: dict[BusId, float] = market_coupling_result.bus_prices.loc[0, :].to_dict()

        cashflows: dict[PlayerId, NetCashflow] = {}
        for player in game_state.players:
            cashflows[player.id] = FinanceCalculator.compute_assets_cashflow(
                assets=game_state.assets.get_all_for_player(player.id, only_active=True),
                assets_dispatch=assets_dispatch,
                bus_prices=bus_prices,
            ) + FinanceCalculator.compute_transmission_cashflow(
                transmission_repo=game_state.transmission.get_all_for_player(player.id, only_active=True),
                transmission_flows=transmission_flows,
                bus_prices=bus_prices,
            )

        return cashflows

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
