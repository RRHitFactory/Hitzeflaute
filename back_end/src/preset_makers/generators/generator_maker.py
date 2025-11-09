import math
import os
import yaml
import numpy as np

from dataclasses import dataclass
from functools import cached_property

from src.models.ids import AssetId, PlayerId, BusId
from src.models.assets import AssetInfo, AssetType


@dataclass
class TechEvolutionIndicator:
    base: float
    change_per_round: float
    max: float
    min: float


@dataclass
class TechnologySpecs:
    technology_name: str
    # capacity and production uncertainty data
    capacity: TechEvolutionIndicator
    normalised_power_std: float  # as a fraction of capacity

    # purchase cost
    capital_cost_per_mw: TechEvolutionIndicator

    # operating costs
    fixed_cost: TechEvolutionIndicator
    marginal_cost: TechEvolutionIndicator

    # lifespan
    lifespan: TechEvolutionIndicator

    @classmethod
    def from_yaml(cls, technology_name: str) -> "TechnologySpecs":

        with open(os.path.dirname(f"{__file__}/tech_specs/") + f"/{technology_name}.yaml", "r") as file:
            data = yaml.safe_load(file)

        return cls(
            technology_name=technology_name,
            capacity=TechEvolutionIndicator(**data["capacity"]),
            normalised_power_std=data["normalised_power_std"],
            capital_cost_per_mw=TechEvolutionIndicator(**data["capital_cost"]),
            fixed_cost=TechEvolutionIndicator(**data["fixed_cost"]),
            marginal_cost=TechEvolutionIndicator(**data["marginal_cost"]),
            lifespan=TechEvolutionIndicator(**data["lifespan"]),
        )


class GeneratorMaker:

    @cached_property
    def available_technologies(self) -> list[str]:
        return [
            technology_name.split(".")[0]
            for technology_name in os.listdir(os.path.dirname(f"{__file__}/tech_specs/"))
        ]

    def parse_technology_specs(self, technology_name: str) -> TechnologySpecs:
        assert technology_name in self.available_technologies, \
            f"Technology not available, select from: {self.available_technologies}."
        return TechnologySpecs.from_yaml(technology_name)

    def clipped_linear_function(self, tech_var: TechEvolutionIndicator, current_round: int) -> float:
        """ f(x) = a * x + b"""
        return np.clip(
            a=tech_var.change_per_round * current_round + tech_var.base,
            a_min=tech_var.min,
            a_max=tech_var.max
        )

    def compute_power_std(self, current_round: int, tech_specs: TechnologySpecs) -> float:
        return tech_specs.normalised_power_std * self.compute_capacity(current_round, tech_specs)

    def compute_capacity(self, current_round: int, tech_specs: TechnologySpecs) -> float:
        return self.clipped_linear_function(tech_var=tech_specs.capacity, current_round=current_round)

    def compute_capital_cost(self, current_round: int, tech_specs: TechnologySpecs) -> float:
        return self.clipped_linear_function(
            tech_var=tech_specs.capital_cost_per_mw,
            current_round=current_round
        ) * self.compute_capacity(current_round, tech_specs)

    def compute_fixed_operating_cost(self, current_round: int, tech_specs: TechnologySpecs) -> float:
        return self.clipped_linear_function(tech_var=tech_specs.fixed_cost, current_round=current_round)

    def compute_marginal_cost(self, current_round: int, tech_specs: TechnologySpecs) -> float:
        return self.clipped_linear_function(tech_var=tech_specs.marginal_cost, current_round=current_round)

    def compute_health(self, current_round: int, tech_specs: TechnologySpecs) -> int:
        return math.floor(self.clipped_linear_function(tech_var=tech_specs.lifespan, current_round=current_round))

    def make(
            self,
            technology_name: str,
            asset_id: AssetId,
            bus_id: BusId,
            current_round: int,
            player_id: PlayerId=PlayerId.get_npc()
    ) -> AssetInfo:
        """Create a generator with properties based on the current round."""
        tech_specs = self.parse_technology_specs(technology_name)
        return AssetInfo(
            id=asset_id,
            owner_player=player_id,
            asset_type=AssetType.GENERATOR,
            bus=bus_id,
            birthday=current_round,
            asset_technology=tech_specs.technology_name,
            is_for_sale=player_id == PlayerId.get_npc(),
            power_expected=self.compute_capacity(current_round, tech_specs),
            power_std=self.compute_power_std(current_round, tech_specs),
            minimum_acquisition_price=self.compute_capital_cost(current_round, tech_specs),
            fixed_operating_cost=self.compute_fixed_operating_cost(current_round, tech_specs),
            marginal_cost=self.compute_marginal_cost(current_round, tech_specs),
            bid_price=self.compute_marginal_cost(current_round, tech_specs),
            health=self.compute_health(current_round, tech_specs),
        )
