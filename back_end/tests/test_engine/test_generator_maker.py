from back_end.src.preset_makers.generators.generator_maker import GeneratorMaker
from back_end.src.models.assets import AssetInfo
from back_end.src.models.ids import AssetId, BusId, PlayerId

from tests.base_test import BaseTest


class TestGeneratorMaker(BaseTest):

    def test_make_generator(self):
        generator = GeneratorMaker.make(
            technology_name='wind',
            asset_id=AssetId(1),
            bus_id=BusId(1),
            current_round=0,
            player_id=PlayerId.get_npc()
        )

        self.assertIsInstance(generator, AssetInfo)

    def test_available_technologies(self):
        technologies = GeneratorMaker.available_technologies()

        for tech in ['wind', 'nuclear', 'gas']:
            self.assertIn(tech, technologies)
