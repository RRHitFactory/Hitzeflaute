from src.models.ids import BusId, TransmissionId
from src.models.player import PlayerId
from tests.base_test import BaseTest
from tests.utils.repo_maker import TransmissionInfo, TransmissionRepo


class TestTransmission(BaseTest):
    def test_get_bus_pairs(self) -> None:
        repo = TransmissionRepo(dcs=[
            TransmissionInfo(
                id=TransmissionId(0),
                owner_player=PlayerId(1),
                bus1=BusId(0),
                bus2=BusId(1),
                reactance=0.1
            ),
            TransmissionInfo(
                id=TransmissionId(1),
                owner_player=PlayerId(1),
                bus1=BusId(0),
                bus2=BusId(1),
                reactance=0.1
            ),
            TransmissionInfo(
                id=TransmissionId(2),
                owner_player=PlayerId(1),
                bus1=BusId(1),
                bus2=BusId(2),
                reactance=0.1
            )

        ])
        bus_pairs = repo.get_all_bus_pairs()
        self.assertEqual(len(bus_pairs), 3)
        self.assertEqual(len(set(bus_pairs)), 2)
        self.assertEqual(bus_pairs[0], (BusId(0), BusId(1)))

