from dataclasses import dataclass

from src.models.data.ldc_repo import LdcRepo
from src.models.data.light_dc import LightDc


@dataclass(frozen=True)
class TechnologySettings(LightDc):
    tech_name: str
    enabled: bool
    probability_of_appearing: float


class TechnologySettingsRepo(LdcRepo[TechnologySettings]):
    @classmethod
    def _get_dc_type(cls) -> type[TechnologySettings]:
        return TechnologySettings

    def __post_init__(self) -> None:
        assert len(self.get_set_all_names()) == len(self)
        assert self.get_sum_of_probabilities() == 1.0

    def get_set_all_names(self) -> set[str]:
        return {t.tech_name for t in self}

    def get_sum_of_probabilities(self) -> float:
        return sum([t.probability_of_appearing for t in self])

    def get_all_enabled(self) -> "TechnologySettingsRepo":
        return self._filter({"enabled": True})

    def get_names_and_probabilities(self) -> tuple[list[str], list[float]]:
        return [t.tech_name for t in self], [t.probability_of_appearing for t in self]


class MakeTechSettings:
    @classmethod
    def create_default_load_tech_settings(cls) -> TechnologySettingsRepo:
        return TechnologySettingsRepo([
                TechnologySettings(id=1, tech_name="residential", enabled=True, probability_of_appearing=0.7),
                TechnologySettings(id=2, tech_name="industrial", enabled=True, probability_of_appearing=0.3),
                TechnologySettings(id=3, tech_name="freezer", enabled=False, probability_of_appearing=0.0),
            ])

    @classmethod
    def create_default_generator_settings(cls) -> TechnologySettingsRepo:
        return TechnologySettingsRepo([
                TechnologySettings(id=1, tech_name="ccgt", enabled=True, probability_of_appearing=0.1),
                TechnologySettings(id=2, tech_name="coal", enabled=True, probability_of_appearing=0.1),
                TechnologySettings(id=3, tech_name="gas_turbine", enabled=True, probability_of_appearing=0.1),
                TechnologySettings(id=4, tech_name="lignite", enabled=True, probability_of_appearing=0.15),
                TechnologySettings(id=5, tech_name="nuclear", enabled=True, probability_of_appearing=0.05),
                TechnologySettings(id=6, tech_name="solar", enabled=True, probability_of_appearing=0.25),
                TechnologySettings(id=7, tech_name="wind", enabled=True, probability_of_appearing=0.25),
            ])

    @classmethod
    def create_default_transmission_settings(cls) -> TechnologySettingsRepo:
        return TechnologySettingsRepo([
                TechnologySettings(id=1, tech_name="AC", enabled=True, probability_of_appearing=0.5),
                TechnologySettings(id=2, tech_name="DC", enabled=True, probability_of_appearing=0.5),
            ])
