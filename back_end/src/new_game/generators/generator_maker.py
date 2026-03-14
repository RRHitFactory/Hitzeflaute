import math
import os
from dataclasses import dataclass

import numpy as np
import yaml

from src.models.assets import AssetInfo, AssetType
from src.models.ids import AssetId, BusId, PlayerId
from src.tools.random_choice import random_choice


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
        """Linear function with clipping at min and max"""
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

        with open(f"{os.path.dirname(__file__)}/tech_specs/{technology_name}.yaml") as file:
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
    def make_one(
            cls,
            asset_id: AssetId,
            bus_id: BusId,
            current_round: int,
            technology_name: str | None = None,
            player_id: PlayerId=PlayerId.get_npc()
    ) -> AssetInfo:
        """Create a generator with properties based on the current round."""
        if technology_name is None:
            technology_name = random_choice(cls.get_available_technologies())
        tech_specs = cls._get_technology_spec(technology_name)


        capacity = tech_specs.capacity.value_at_round(current_round)
        power_std = tech_specs.normalised_power_std * capacity
        capital_cost = tech_specs.capital_cost_per_mw.value_at_round(current_round) * capacity

        foc = tech_specs.fixed_cost.value_at_round(current_round)

        marginal_cost = tech_specs.marginal_cost.value_at_round(current_round)

        helath = math.floor(tech_specs.lifespan.value_at_round(current_round))

        bid_price = ((marginal_cost * capacity) + foc)/capacity


        return AssetInfo(
            id=asset_id,
            owner_player=player_id,
            asset_type=AssetType.GENERATOR,
            bus=bus_id,
            birthday=current_round,
            technology=tech_specs.technology_name,
            is_for_sale=player_id == PlayerId.get_npc(),
            power_expected=capacity,
            power_std=power_std,
            minimum_acquisition_price=capital_cost,
            fixed_operating_cost=foc,
            marginal_cost=marginal_cost,
            bid_price=bid_price,
            health=helath,
        )

    @classmethod
    def get_available_technologies(cls) -> list[str]:
        return [
            technology_name.split(".")[0]
            for technology_name in os.listdir(f"{os.path.dirname(__file__)}/tech_specs/")
            if technology_name != 'info'
        ]


    @classmethod
    def _get_technology_spec(cls, technology_name: str) -> TechnologySpecs:
        assert technology_name in cls.get_available_technologies(), \
            f"Technology not available, select from: {cls.get_available_technologies()}."
        return TechnologySpecs.from_yaml(technology_name)

