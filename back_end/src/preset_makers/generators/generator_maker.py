import math
import os
import yaml
import numpy as np

from dataclasses import dataclass

from back_end.src.models.ids import AssetId, PlayerId, BusId
from back_end.src.models.assets import AssetInfo, AssetType


@dataclass(frozen=True)
class TechEvolutionIndicator:
    base: float
    change_per_round: float
    max: float
    min: float

    def __post_init__(self):
        assert self.min <= self.base <= self.max, \
            "Base value must be within min and max bounds."

    def value_at_round(self, round_number: int) -> float:
        """ Linear function with clipping at min and max """
        val = self.base + self.change_per_round * round_number
        return np.clip(val, self.min, self.max)


@dataclass(frozen=True)
class TechnologySpecs:
    technology_name: str
    capacity: TechEvolutionIndicator
    normalised_power_std: float  # as a fraction of capacity
    capital_cost_per_mw: TechEvolutionIndicator
    fixed_cost: TechEvolutionIndicator
    marginal_cost: TechEvolutionIndicator
    lifespan: TechEvolutionIndicator

    @classmethod
    def from_yaml(cls, technology_name: str) -> "TechnologySpecs":

        with open(f"{os.path.dirname(__file__)}\\tech_specs\\{technology_name}.yaml", "r") as file:
            data = yaml.safe_load(file)

        return cls(
            technology_name=technology_name,
            capacity=TechEvolutionIndicator(**data["capacity"]),
            normalised_power_std=data["normalised_power_std"],
            capital_cost_per_mw=TechEvolutionIndicator(**data["capital_cost_per_mw"]),
            fixed_cost=TechEvolutionIndicator(**data["fixed_cost"]),
            marginal_cost=TechEvolutionIndicator(**data["marginal_cost"]),
            lifespan=TechEvolutionIndicator(**data["lifespan"]),
        )


class GeneratorMaker:

    @classmethod
    def available_technologies(cls) -> list[str]:
        return [
            technology_name.split(".")[0]
            for technology_name in os.listdir(f"{os.path.dirname(__file__)}\\tech_specs\\")
        ]

    @classmethod
    def parse_technology_specs(cls, technology_name: str) -> TechnologySpecs:
        assert technology_name in cls.available_technologies(), \
            f"Technology not available, select from: {cls.available_technologies()}."
        return TechnologySpecs.from_yaml(technology_name)

    @classmethod
    def clipped_linear_function(cls, tech_var: TechEvolutionIndicator, current_round: int) -> float:
        """ f(x) = a * x + b"""
        return np.clip(
            a=tech_var.change_per_round * current_round + tech_var.base,
            a_min=tech_var.min,
            a_max=tech_var.max
        )

    @classmethod
    def compute_power_std(cls, current_round: int, tech_specs: TechnologySpecs) -> float:
        return tech_specs.normalised_power_std * cls.compute_capacity(current_round, tech_specs)

    @classmethod
    def compute_capacity(cls, current_round: int, tech_specs: TechnologySpecs) -> float:
        return tech_specs.capacity.value_at_round(current_round)

    @classmethod
    def compute_capital_cost(cls, current_round: int, tech_specs: TechnologySpecs) -> float:
        return tech_specs.capital_cost_per_mw.value_at_round(current_round) * cls.compute_capacity(current_round, tech_specs)

    @classmethod
    def compute_fixed_operating_cost(cls, current_round: int, tech_specs: TechnologySpecs) -> float:
        return tech_specs.fixed_cost.value_at_round(current_round)

    @classmethod
    def compute_marginal_cost(cls, current_round: int, tech_specs: TechnologySpecs) -> float:
        return tech_specs.marginal_cost.value_at_round(current_round)

    @classmethod
    def compute_health(cls, current_round: int, tech_specs: TechnologySpecs) -> int:
        return math.floor(tech_specs.lifespan.value_at_round(current_round))

    @classmethod
    def make(
            cls,
            technology_name: str,
            asset_id: AssetId,
            bus_id: BusId,
            current_round: int,
            player_id: PlayerId=PlayerId.get_npc()
    ) -> AssetInfo:
        """Create a generator with properties based on the current round."""
        tech_specs = cls.parse_technology_specs(technology_name)
        return AssetInfo(
            id=asset_id,
            owner_player=player_id,
            asset_type=AssetType.GENERATOR,
            bus=bus_id,
            birthday=current_round,
            technology=tech_specs.technology_name,
            is_for_sale=player_id == PlayerId.get_npc(),
            power_expected=cls.compute_capacity(current_round, tech_specs),
            power_std=cls.compute_power_std(current_round, tech_specs),
            minimum_acquisition_price=cls.compute_capital_cost(current_round, tech_specs),
            fixed_operating_cost=cls.compute_fixed_operating_cost(current_round, tech_specs),
            marginal_cost=cls.compute_marginal_cost(current_round, tech_specs),
            bid_price=cls.compute_marginal_cost(current_round, tech_specs),
            health=cls.compute_health(current_round, tech_specs),
        )
