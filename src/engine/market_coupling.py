import logging
import warnings

import pandas as pd
import pypsa

from src.models.assets import AssetId, AssetRepo
from src.models.buses import BusId
from src.models.game_state import GameState
from src.models.market_coupling_result import MarketCouplingResult
from src.models.transmission import TransmissionId, TransmissionRepo


class OptimizationError(Exception):
    def __init__(self, game_state: GameState, message: str) -> None:
        super().__init__(message)
        self.game_state = game_state
        self.message = message


class MarketCouplingCalculator:
    @classmethod
    def run(cls, game_state: GameState) -> MarketCouplingResult:
        network = cls.create_pypsa_network(game_state)
        cls.optimize_network(network=network, game_state=game_state)

        return MarketCouplingResult(
            bus_prices=cls.get_bus_prices(network),
            transmission_flows=cls.get_transmission_flows(network=network, transmission=game_state.transmission),
            assets_dispatch=cls.get_assets_dispatch(network=network, assets=game_state.assets),
        )

    @classmethod
    def create_pypsa_network(cls, game_state: GameState) -> pypsa.Network:
        """
        Create a PyPSA network from the game state.
        :param game_state: The current state of the game
        :return: A PyPSA network object
        """
        network = pypsa.Network()
        network.set_snapshots(pd.Index([0], name="time"))  # Single snapshot for simplicity

        network.add(class_name="Carrier", name="AC")
        for bus in game_state.buses:
            network.add(class_name="Bus", name=cls.get_pypsa_name(bus.id), carrier="AC")
        for line in game_state.transmission:
            if not line.is_active:
                continue
            network.add(
                class_name="Line",
                name=cls.get_pypsa_name(line.id),
                bus0=cls.get_pypsa_name(line.bus1),
                bus1=cls.get_pypsa_name(line.bus2),
                x=line.reactance,
                # r=0.01 * line.reactance,  # Assuming a small resistance for numerical stability
                s_nom=line.capacity,
                carrier="AC",
            )
        for generator in game_state.assets.only_generators:
            if not generator.is_active:
                continue
            network.add(
                class_name="Generator",
                name=cls.get_pypsa_name(generator.id),
                bus=cls.get_pypsa_name(generator.bus),
                marginal_cost=generator.bid_price,
                p_nom=generator.sample_power(),
                carrier="AC",
            )
        for load in game_state.assets.only_loads:
            if not load.is_active:
                continue
            # Loads are treated as generators with negative power in PyPSA
            network.add(
                class_name="Generator",
                name=cls.get_pypsa_name(load.id),
                bus=cls.get_pypsa_name(load.bus),
                p_max_pu=0,
                p_min_pu=-1.0,
                p_nom=load.sample_power(),
                marginal_cost=load.bid_price,
                carrier="AC",
            )
        return network

    @classmethod
    def optimize_network(cls, network: pypsa.Network, game_state: GameState) -> None:
        # TODO All solver logs have been silenced apart from the Highs Banner. Maybe there is an option here?
        #  https://github.com/ERGO-Code/HiGHS/blob/364c83a51e44ba6c27def9c8fc1a49b1daf5ad5c/highs/highspy/_core/__init__.pyi#L401
        logging.getLogger("linopy").setLevel(logging.ERROR)
        logging.getLogger("pypsa").setLevel(logging.ERROR)
        with warnings.catch_warnings(action="ignore"):
            res = network.optimize(
                solver_name="highs",
                solver_options={"log_to_console": False, "output_flag": False},
            )
        if res[1] != "optimal":
            raise OptimizationError(
                game_state=game_state,
                message=f"PyPSA optimization failed with status: {res[1]}. Please check the network setup.",
            )
        return

    @classmethod
    def get_bus_prices(cls, network: pypsa.Network) -> pd.DataFrame:
        return cls._tidy_df(df=network.buses_t.marginal_price, column_name="Bus")

    @classmethod
    def get_transmission_flows(cls, network: pypsa.Network, transmission: TransmissionRepo) -> pd.DataFrame:
        df = cls._tidy_df(df=network.lines_t.p0, column_name="Line")
        # Add zero flows to open lines
        open_ids = transmission.only_open.transmission_ids
        df.loc[:, open_ids] = 0.0
        df.sort_index(axis=1, inplace=True)  # Sort columns by transmission ID
        return df

    @classmethod
    def get_assets_dispatch(cls, network: pypsa.Network, assets: AssetRepo) -> pd.DataFrame:
        # Note that all values are positive. For generators this means production, for loads it means consumption.
        df = cls._tidy_df(df=network.generators_t.p, column_name="Asset").abs()
        # Add zero dispatch to inactive assets
        open_ids = assets.only_inactive.asset_ids
        df.loc[:, open_ids] = 0.0
        df.sort_index(axis=1, inplace=True)  # Sort columns by asset ID
        return df

    @classmethod
    def _tidy_df(cls, df: pd.DataFrame, column_name: str | None = None) -> pd.DataFrame:
        df = df.copy()
        df.rename(columns=cls.get_game_id, inplace=True)
        df.index = df.index.rename("time")
        if column_name is not None:
            df.columns = df.columns.rename(column_name)
        return df

    @staticmethod
    def get_pypsa_name(id_in_game: BusId | TransmissionId | AssetId) -> str:
        if isinstance(id_in_game, BusId):
            return f"bus_{id_in_game}"
        elif isinstance(id_in_game, TransmissionId):
            return f"line_{id_in_game}"
        elif isinstance(id_in_game, AssetId):
            return f"asset_{id_in_game}"
        raise ValueError(f"Unsupported ID type: {type(id_in_game)}")

    @staticmethod
    def get_game_id(pypsa_name: str) -> BusId | TransmissionId | AssetId:
        def get_id_substring(name: str) -> str:
            return name.split("_")[-1]

        if pypsa_name.startswith("bus_"):
            return BusId(get_id_substring(pypsa_name))
        elif pypsa_name.startswith("line_"):
            return TransmissionId(get_id_substring(pypsa_name))
        elif pypsa_name.startswith("asset_"):
            return AssetId(get_id_substring(pypsa_name))
        else:
            raise ValueError(f"Unknown PyPSA name format: {pypsa_name}")
