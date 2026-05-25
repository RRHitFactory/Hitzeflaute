from dataclasses import dataclass

import dataframely as dy
import polars as pl

from src.ids import TechnologySettingsId
from src.models.data.light_dc import LightDc
from src.models.data.polar_repo import PolarRepo


@dataclass(frozen=True)
class TechnologySettings(LightDc):
    id: TechnologySettingsId
    tech_name: str
    enabled: bool
    probability_of_appearing: float


class TechnologySettingsRepoSchema(dy.Schema):
    id = TechnologySettingsId._get_dy_column(primary_key=True)
    tech_name = dy.String(max_length=30)
    enabled = dy.Bool()
    probability_of_appearing = dy.Float64(min=0.0, max=1.0)

    @dy.rule()
    def valid_probabilities(self) -> pl.Expr:
        return pl.col("probability_of_appearing").sum() == 1.0


class TechnologySettingsRepo(PolarRepo[TechnologySettingsRepoSchema, TechnologySettings, TechnologySettingsId]):
    @classmethod
    def get_schema(cls) -> tuple[type[TechnologySettingsRepoSchema], type[TechnologySettings], type[TechnologySettingsId]]:
        return TechnologySettingsRepoSchema, TechnologySettings, TechnologySettingsId

    def get_set_of_all_names(self) -> set[str]:
        return {t.tech_name for t in self}

    def get_all_enabled(self) -> "TechnologySettingsRepo":
        return self._filter(pl.col("enabled"))

    def get_names_and_probabilities(self) -> tuple[list[str], list[float]]:
        return self.df["tech_name"].to_list(), self.df["probability_of_appearing"].to_list()


class MakeTechSettings:
    @classmethod
    def create_default_load_tech_settings(cls) -> TechnologySettingsRepo:
        return TechnologySettingsRepo([
                TechnologySettings(id=TechnologySettingsId(1), tech_name="residential", enabled=True, probability_of_appearing=0.7),
                TechnologySettings(id=TechnologySettingsId(2), tech_name="industrial", enabled=True, probability_of_appearing=0.3),
                TechnologySettings(id=TechnologySettingsId(3), tech_name="freezer", enabled=False, probability_of_appearing=0.0),
            ])

    @classmethod
    def create_default_generator_settings(cls) -> TechnologySettingsRepo:
        return TechnologySettingsRepo([
                TechnologySettings(id=TechnologySettingsId(1), tech_name="ccgt", enabled=True, probability_of_appearing=0.1),
                TechnologySettings(id=TechnologySettingsId(2), tech_name="coal", enabled=True, probability_of_appearing=0.1),
                TechnologySettings(id=TechnologySettingsId(3), tech_name="gas_turbine", enabled=True, probability_of_appearing=0.1),
                TechnologySettings(id=TechnologySettingsId(4), tech_name="lignite", enabled=True, probability_of_appearing=0.15),
                TechnologySettings(id=TechnologySettingsId(5), tech_name="nuclear", enabled=True, probability_of_appearing=0.05),
                TechnologySettings(id=TechnologySettingsId(6), tech_name="solar", enabled=True, probability_of_appearing=0.25),
                TechnologySettings(id=TechnologySettingsId(7), tech_name="wind", enabled=True, probability_of_appearing=0.25),
            ])

    @classmethod
    def create_default_transmission_settings(cls) -> TechnologySettingsRepo:
        return TechnologySettingsRepo([
                TechnologySettings(id=TechnologySettingsId(1), tech_name="AC", enabled=True, probability_of_appearing=0.5),
                TechnologySettings(id=TechnologySettingsId(2), tech_name="DC", enabled=True, probability_of_appearing=0.5),
            ])
