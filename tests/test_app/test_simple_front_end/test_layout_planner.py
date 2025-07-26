from unittest import TestCase

from src.app.simple_front_end.layout_planner import LayoutPlanner, Socket
from src.models.ids import AssetId, TransmissionId
from tests.utils.game_state_maker import GameStateMaker


class TestLayoutPlanner(TestCase):
    def test_sockets_are_deterministic(self) -> None:
        Plan = tuple[dict[AssetId, Socket], dict[TransmissionId, tuple[Socket, Socket]]]

        game_state = GameStateMaker().make()
        func = LayoutPlanner.get_sockets_for_assets_and_transmission
        plans: list[Plan] = [func(game_state=game_state) for _ in range(5)]

        def assert_plans_are_equal(plan_a: Plan, plan_b: Plan) -> None:
            asset_a, line_a = plan_a
            asset_b, line_b = plan_b

            self.assertEqual(set(asset_a.keys()), set(asset_b.keys()))
            self.assertEqual(set(line_a.keys()), set(line_b.keys()))
            for asset_id in asset_a:
                self.assertEqual(asset_a[asset_id], asset_b[asset_id])
            for line_id in line_a:
                self.assertEqual(line_a[line_id], line_b[line_id])

        first_plan = plans[0]
        for p in plans[1:]:
            assert_plans_are_equal(p, first_plan)
