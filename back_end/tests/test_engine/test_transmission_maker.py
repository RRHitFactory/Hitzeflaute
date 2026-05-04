from src.models.ids import TransmissionId, BusId, PlayerId, Round
from src.models.transmission import TransmissionInfo
from src.new_game.transmission.transmission_maker import TransmissionMaker
from tests.base_test import BaseTest


class TestTransmissionMaker(BaseTest):
    def test_make_transmission(self):
        transmission = TransmissionMaker.make_one(technology_name="AC", transmission_id=TransmissionId(1), bus1=BusId(1), bus2=BusId(2), current_round=Round(0), player_id=PlayerId.get_npc())

        self.assertIsInstance(transmission, TransmissionInfo)

    def test_available_technologies(self):
        technologies = TransmissionMaker.get_available_technologies()

        for tech in ["ac", "dc"]:
            self.assertIn(tech, technologies)
