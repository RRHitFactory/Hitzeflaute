import math
import os
from pathlib import Path

from src.models.assets import AssetInfo, AssetType
from src.models.ids import AssetId, BusId, PlayerId
from src.new_game.util.technology_specs import TechnologySpecs
from src.tools.random_choice import random_choice


class LoadMaker:
    path = Path(os.path.dirname(__file__))

    @classmethod
    def make_one(
            cls,
            asset_id: AssetId,
            bus_id: BusId,
            current_round: int,
            technology_name: str | None = None,
            player_id: PlayerId = PlayerId.get_npc(),
            non_freezer: bool = True
    ) -> AssetInfo:
        """Create a load with properties based on the current round."""
        if technology_name is None:
            available_techs = cls.get_available_technologies()
            if non_freezer:
                available_techs.remove("freezer")
            technology_name = random_choice(available_techs)

        tech_specs = cls._get_technology_spec(technology_name)

        capacity = tech_specs.capacity.value_at_round(current_round)
        power_std = tech_specs.normalised_power_std * capacity
        capital_cost = tech_specs.capital_cost_per_mw.value_at_round(current_round) * capacity

        foc = tech_specs.fixed_cost.value_at_round(current_round)

        marginal_cost = tech_specs.marginal_cost.value_at_round(current_round)

        health = math.floor(tech_specs.lifespan.value_at_round(current_round))

        bid_price = ((marginal_cost * capacity) + foc) / capacity

        return AssetInfo(
            id=asset_id,
            owner_player=player_id,
            asset_type=AssetType.LOAD,
            bus=bus_id,
            birthday=current_round,
            technology=tech_specs.technology_name,
            is_for_sale=player_id == PlayerId.get_npc(),
            power_expected=capacity,
            power_std=power_std,
            minimum_acquisition_price=capital_cost,
            fixed_operating_cost=foc,
            marginal_cost=marginal_cost,  # marginal_cost of loads refer to marginal utility, thus, they will create revenue
            bid_price=bid_price,
            health=health,
            is_freezer=tech_specs.technology_name == "freezer",
        )

    @classmethod
    def get_available_technologies(cls) -> list[str]:
        tech_specs_dir = LoadMaker.path / "tech_specs"
        yaml_files = tech_specs_dir.rglob("*.yaml")
        return [f.stem for f in yaml_files]

    @classmethod
    def _get_technology_spec(cls, technology_name: str) -> TechnologySpecs:
        assert technology_name in cls.get_available_technologies(), f"Technology not available, select from: {cls.get_available_technologies()}."
        return TechnologySpecs.from_yaml(LoadMaker.path, technology_name)
