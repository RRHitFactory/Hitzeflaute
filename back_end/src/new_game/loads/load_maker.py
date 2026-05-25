import math
import os
from pathlib import Path

from src.models.assets import AssetInfo, AssetType
from src.models.game_settings import GameSettings
from src.models.ids import AssetId, BusId, PlayerId, Round
from src.new_game.util.available_technologies import get_available_technologies
from src.new_game.util.technology_specs import TechnologySpecs
from src.tools.random_choice import random_choice


class LoadMaker:
    path = Path(os.path.dirname(__file__))

    @classmethod
    def make_one(cls, asset_id: AssetId, bus_id: BusId, current_round: Round, settings: GameSettings, technology_name: str | None = None, player_id: PlayerId = PlayerId.get_npc(), except_freezer: bool = True) -> AssetInfo:
        """Create a load with properties based on the current round."""
        if technology_name is None:
            available_techs = settings.loads.get_all_enabled()
            tech_names, tech_probabilities = available_techs.get_names_and_probabilities()
            if except_freezer and "freezer" in tech_names:
                for i in range(len(tech_names)):
                    if tech_names[i] == "freezer":
                        tech_names.pop(i)
                        tech_probabilities.pop(i)
                        break
            technology_name = random_choice(tech_names, p=tech_probabilities)

        tech_specs = cls._get_technology_spec(technology_name)

        capacity = tech_specs.capacity.value_at_round(current_round)
        power_std = tech_specs.normalised_power_std * capacity
        capital_cost = tech_specs.capital_cost_per_mw.value_at_round(current_round) * capacity

        foc = tech_specs.fixed_cost.value_at_round(current_round) if settings.enable_fixed_costs else 0.0

        marginal_cost = tech_specs.marginal_cost.value_at_round(current_round)

        health = math.floor(tech_specs.lifespan.value_at_round(current_round))

        bid_price = round(((marginal_cost * capacity) + foc) / capacity)

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
        return get_available_technologies(category="loads")

    @classmethod
    def _get_technology_spec(cls, technology_name: str) -> TechnologySpecs:
        assert technology_name in cls.get_available_technologies(), f"Technology not available, select from: {cls.get_available_technologies()}."
        return TechnologySpecs.from_yaml(LoadMaker.path, technology_name)
