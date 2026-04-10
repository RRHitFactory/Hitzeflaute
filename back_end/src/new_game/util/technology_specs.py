from dataclasses import dataclass
from pathlib import Path

import numpy as np
import yaml


@dataclass(frozen=True)
class TechEvolutionIndicator:
    base: float
    change_per_round: float
    max: float
    min: float

    def __post_init__(self):
        assert self.min <= self.base <= self.max, "Base value must be within min and max bounds."

    def value_at_round(self, round_number: int) -> float:
        """Linear function with clipping at min and max"""
        val = self.base + self.change_per_round * round_number
        return float(np.clip(val, self.min, self.max))


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
    def from_yaml(cls, dir_containing_tech_specs: Path, technology_name: str) -> "TechnologySpecs":
        with open(f"{dir_containing_tech_specs}/tech_specs/{technology_name}.yaml") as file:
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
