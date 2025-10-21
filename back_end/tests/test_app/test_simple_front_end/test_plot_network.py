from back_end.tests.base_test import BaseTest

from src.app.simple_front_end.plotting.grid_plotter import GridPlotter
from tests.utils.game_state_maker import GameStateMaker
from tests.utils.repo_maker import BusRepoMaker, PlayerRepoMaker, TransmissionRepoMaker


class TestPlotNetwork(BaseTest):
    def test_plot_network(self) -> None:
        player_repo = PlayerRepoMaker.make_quick()
        bus_repo = BusRepoMaker.make_quick(n_npc_buses=0)
        transmission_repo = TransmissionRepoMaker.make_quick(players=player_repo.player_ids, buses=bus_repo, n=2)
        game_state = GameStateMaker().add_player_repo(player_repo=player_repo).add_bus_repo(bus_repo=bus_repo).add_transmission_repo(transmission_repo=transmission_repo).make()
        GridPlotter().make_figure(game_state=game_state).show()
