import shutil

from src.app.game_manager import GameManager
from src.app.game_repo.file_game_repo import FileGameStateRepo
from src.app.lobby_manager import LobbyManager
from src.directories import test_dir
from src.engine.engine import Engine

from tests.base_test import BaseTest


class TestGameAndLobbyManager(BaseTest):
    def setUp(self) -> None:
        self.scratch_dir = test_dir / "scratch"
        if self.scratch_dir.exists():
            shutil.rmtree(self.scratch_dir)
        self.scratch_dir.mkdir(exist_ok=True)

    def tearDown(self) -> None:
        if self.scratch_dir.exists():
            shutil.rmtree(self.scratch_dir)

    def test_unique_game_ids_are_assigned(self) -> None:
        game_repo = FileGameStateRepo(cache_dir=test_dir / "scratch")
        game_manager = GameManager(game_repo=game_repo, game_engine=Engine())
        lobby_manager = LobbyManager(game_manager=game_manager)

        game_id = game_manager.new_game(
            game_repo=game_repo, player_names=["Robbie", "Roman"]
        )
        lobby_game_id = lobby_manager.create_lobby(host_name="Cindy")
        game_id_2 = game_manager.new_game(
            game_repo=game_repo, player_names=["Robbie", "Roman"]
        )
        lobby_game_id_2 = lobby_manager.create_lobby(host_name="Cindy")
        self.assertEqual(
            len(set([game_id, lobby_game_id, game_id_2, lobby_game_id_2])), 4
        )
