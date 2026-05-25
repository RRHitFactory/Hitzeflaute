import math
import os
from pathlib import Path

from src.ids import BusId, PlayerId, Round, TransmissionId
from src.models.game_settings import GameSettings
from src.models.transmission import TransmissionInfo
from src.new_game.transmission.tranmission_technology_specs import TransmissionTechnologySpecs
from src.new_game.util.available_technologies import get_available_technologies
from src.tools.random_choice import random_choice


class TransmissionMaker:
    path = Path(os.path.dirname(__file__))

    @classmethod
    def make_one(cls, transmission_id: TransmissionId, bus1: BusId, bus2: BusId, current_round: Round, settings: GameSettings, technology_name: str | None = None, player_id: PlayerId = PlayerId.get_npc()) -> TransmissionInfo:
        """Create a load with properties based on the current round."""
        if technology_name is None:
            available_techs = settings.transmission.get_all_enabled()
            tech_names, tech_probabilities = available_techs.get_names_and_probabilities()
            technology_name = random_choice(tech_names, p=tech_probabilities)

        tech_specs = cls._get_technology_spec(technology_name)

        reactance = tech_specs.reactance.value_at_round(current_round)
        capacity = tech_specs.capacity.value_at_round(current_round)
        health = math.floor(tech_specs.lifespan.value_at_round(current_round))

        foc = tech_specs.fixed_cost.value_at_round(current_round) if settings.enable_fixed_costs else 0.0
        capital_cost = round(tech_specs.capital_cost_per_mw.value_at_round(current_round) * capacity)

        line_or_link = tech_specs.line_or_link

        return TransmissionInfo(
            id=transmission_id,
            owner_player=player_id,
            bus1=bus1,
            bus2=bus2,
            reactance=reactance,
            capacity=capacity,
            health=health,
            fixed_operating_cost=foc,
            is_for_sale=True if player_id == PlayerId.get_npc() else False,
            minimum_acquisition_price=capital_cost,
            is_active=True,
            birthday=current_round,
            line_or_link=line_or_link
        )

    @classmethod
    def get_available_technologies(cls) -> list[str]:
        return get_available_technologies(category="transmission")

    @classmethod
    def _get_technology_spec(cls, technology_name: str) -> TransmissionTechnologySpecs:
        assert technology_name in cls.get_available_technologies(), f"Technology not available, select from: {cls.get_available_technologies()}."
        return TransmissionTechnologySpecs.from_yaml(TransmissionMaker.path, technology_name)
