from dataclasses import dataclass
from pathlib import Path
from typing import Literal

import yaml

from src.new_game.util.technology_specs import TechEvolutionIndicator


@dataclass(frozen=True)
class TransmissionTechnologySpecs:
    technology_name: str
    reactance: TechEvolutionIndicator
    capacity: TechEvolutionIndicator
    capital_cost_per_mw: TechEvolutionIndicator
    fixed_cost: TechEvolutionIndicator
    lifespan: TechEvolutionIndicator
    line_or_link: Literal["Line", "Link"]

    @classmethod
    def from_yaml(cls, dir_containing_tech_specs: Path, technology_name: str) -> "TransmissionTechnologySpecs":
        with open(f"{dir_containing_tech_specs}/tech_specs/{technology_name}.yaml") as file:
            data = yaml.safe_load(file)

        return cls(
            technology_name=technology_name,
            reactance=TechEvolutionIndicator(**data["reactance"]),
            capacity=TechEvolutionIndicator(**data["capacity"]),
            capital_cost_per_mw=TechEvolutionIndicator(**data["capital_cost_per_mw"]),
            fixed_cost=TechEvolutionIndicator(**data["fixed_cost"]),
            lifespan=TechEvolutionIndicator(**data["lifespan"]),
            line_or_link=data["line_or_link"],
        )
