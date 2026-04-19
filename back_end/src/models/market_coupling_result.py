from dataclasses import dataclass
from typing import Self

import pandas as pd

from src.models.ids import AssetId, BusId, TransmissionId
from src.models.pnl import PnlFrame
from src.tools.serialization import SerializedDf, SimpleDict, dataframe_to_dict, dict_to_dataframe, polars_dataframe_to_dict


class MarketCouplingResult:
    def __init__(
        self,
        bus_prices: pd.DataFrame,
        transmission_flows: pd.DataFrame,
        assets_dispatch: pd.DataFrame,
    ) -> None:
        self._bus_prices = bus_prices
        self._transmission_flows = transmission_flows
        self._assets_dispatch = assets_dispatch

        self._validate()

    def add_non_cleared_elements(self, new_buses: list[BusId], new_assets: list[AssetId], new_lines: list[TransmissionId]) -> "MarketCouplingResult":
        if len(new_buses):
            bus_prices = self._bus_prices.copy()
            for b in new_buses:
                bus_prices[b.as_int()] = 0.0
        else:
            bus_prices = self._bus_prices

        if len(new_lines):
            transmission_flows = self._transmission_flows.copy()
            for t in new_lines:
                transmission_flows[t.as_int()] = 0.0
        else:
            transmission_flows = self._transmission_flows

        if len(new_assets):
            assets_dispatch = self._assets_dispatch.copy()
            for a in new_assets:
                assets_dispatch[a.as_int()] = 0.0
        else:
            assets_dispatch = self._assets_dispatch

        return MarketCouplingResult(bus_prices=bus_prices, transmission_flows=transmission_flows, assets_dispatch=assets_dispatch)

    def _validate(self) -> None:
        assert self.market_time_units.name == "time", f"Expected time index to have name 'time', but got '{self.market_time_units.name}'"

        dfs_and_expectations = [
            (self.bus_prices, "Bus"),
            (self.transmission_flows, "Line"),
            (self.assets_dispatch, "Asset"),
        ]
        for df, expected_name in dfs_and_expectations:
            assert isinstance(df, pd.DataFrame), f"Expected a DataFrame, but got {type(df)}"
            assert df.index.equals(self.market_time_units)
            assert df.columns.name == expected_name, f"Expected DataFrame columns to be named '{expected_name}', but got '{df.columns.name}'"

        market_time_units = self._bus_prices.index
        assert self._transmission_flows.index.equals(market_time_units), "Transmission flows index does not match bus prices index"
        assert self._assets_dispatch.index.equals(market_time_units), "Assets dispatch index does not match bus prices index"

    def __str__(self) -> str:
        return f"<{self.__class__.__name__}>"

    def __repr__(self) -> str:
        return self.__str__()

    @property
    def market_time_units(self) -> pd.Index:
        """
        :return: Market time units (index of the DataFrames)
        """
        return self._bus_prices.index

    @property
    def bus_prices(self) -> pd.DataFrame:
        """
        :return: DataFrame with
        * Index: Market time units
        * Columns: Bus IDs (as ints)
        * Values: Marginal prices
        """
        return self._bus_prices.copy()

    @property
    def transmission_flows(self) -> pd.DataFrame:
        """
        :return: DataFrame with
        * Index: Market time units
        * Columns: Transmission IDs (as ints)
        * Values: Flows
        """
        # TODO add another cached property that contains congestion rents?
        return self._transmission_flows.copy()

    @property
    def assets_dispatch(self) -> pd.DataFrame:
        """
        :return: DataFrame with
        * Index: Market time units
        * Columns: Asset IDs (as ints)
        * Values: Produced power for generators or consumed power for loads, always positive.
        """
        return self._assets_dispatch.copy()

    def to_simple_dict(self) -> SimpleDict:
        simple_dict = {
            "bus_prices": dataframe_to_dict(self._bus_prices),
            "transmission_flows": dataframe_to_dict(self._transmission_flows),
            "assets_dispatch": dataframe_to_dict(self._assets_dispatch),
        }
        return simple_dict  # type: ignore

    @classmethod
    def from_simple_dict(cls, simple_dict: SimpleDict) -> Self:
        def get_one(key: str, column_index_name: str) -> pd.DataFrame:
            df_data: SerializedDf = simple_dict[key]  # type: ignore
            df = dict_to_dataframe(df_data)
            df.index.name = "time"
            df.index = df.index.map(int)
            df.columns.name = column_index_name
            df.columns = df.columns.map(int)
            return df

        return cls(
            bus_prices=get_one(key="bus_prices", column_index_name="Bus"),
            transmission_flows=get_one(key="transmission_flows", column_index_name="Line"),
            assets_dispatch=get_one(key="assets_dispatch", column_index_name="Asset"),
        )


@dataclass(frozen=True)
class MarketCouplingSummary:
    bus_results: dict[BusId, tuple[float, pd.DataFrame, pd.DataFrame, float]]  # price, generation df, load df, net_position
    line_results: dict[TransmissionId, pd.DataFrame]
    pnl: PnlFrame

    def to_simple_dict(self) -> SimpleDict:
        simple_dict = {
            "bus_results": {str(bus_id): (price, dataframe_to_dict(getn_df), dataframe_to_dict(load_df), np) for bus_id, (price, getn_df, load_df, np) in self.bus_results.items()},
            "line_results": {str(line_id): dataframe_to_dict(df) for line_id, df in self.line_results.items()},
            "pnl": polars_dataframe_to_dict(self.pnl),
        }
        return simple_dict  # type: ignore

    @classmethod
    def from_simple_dict(cls, simple_dict: SimpleDict) -> Self:
        raise NotImplementedError("Deserialization of MarketCouplingSummary is not implemented")
