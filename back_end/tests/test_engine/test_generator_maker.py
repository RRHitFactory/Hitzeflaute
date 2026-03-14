from src.models.assets import AssetInfo
from src.models.ids import AssetId, BusId, PlayerId
from src.new_game.generators.generator_maker import GeneratorMaker
from tests.base_test import BaseTest


class TestGeneratorMaker(BaseTest):

    def test_make_generator(self):
        generator = GeneratorMaker.make_one(
            technology_name='wind',
            asset_id=AssetId(1),
            bus_id=BusId(1),
            current_round=0,
            player_id=PlayerId.get_npc()
        )

        self.assertIsInstance(generator, AssetInfo)

    def test_available_technologies(self):
        technologies = GeneratorMaker.get_available_technologies()

        for tech in ['wind', 'nuclear', 'ccgt']:
            self.assertIn(tech, technologies)
