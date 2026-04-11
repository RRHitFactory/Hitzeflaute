from src.models.assets import AssetInfo
from src.models.ids import AssetId, BusId, PlayerId
from src.new_game.loads.load_maker import LoadMaker
from tests.base_test import BaseTest


class TestLoadMaker(BaseTest):

    def test_make_load(self):
        load = LoadMaker.make_one(
            technology_name='residential',
            asset_id=AssetId(1),
            bus_id=BusId(1),
            current_round=0,
            player_id=PlayerId.get_npc()
        )

        self.assertIsInstance(load, AssetInfo)

    def test_available_technologies(self):
        technologies = LoadMaker.get_available_technologies()

        for tech in ['residential', 'industrial']:
            self.assertIn(tech, technologies)
