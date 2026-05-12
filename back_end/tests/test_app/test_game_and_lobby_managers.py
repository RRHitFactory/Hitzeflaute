import shutil

from src.app.game_manager import GameManager
from src.app.game_repo.file_game_repo import FileGameStateRepo
from src.app.lobby_manager import LobbyManager
from src.directories import test_dir
from src.engine.engine import Engine
from src.models.message import GameToPlayerMessage
from tests.base_test import BaseTest


class DummyFrontEndMessageHandler:
    async def handle_player_messages(self, msgs: list[GameToPlayerMessage]) -> None:
        return None


class TestGameAndLobbyManager(BaseTest):
    def setUp(self) -> None:
        self.scratch_dir = test_dir / "scratch"
        if self.scratch_dir.exists():
            shutil.rmtree(self.scratch_dir)
        self.scratch_dir.mkdir(exist_ok=True)
        self.game_repo = FileGameStateRepo(cache_dir=test_dir / "scratch")
        self.game_manager = GameManager(game_repo=self.game_repo, game_engine=Engine(), front_end=DummyFrontEndMessageHandler())

    def tearDown(self) -> None:
        if self.scratch_dir.exists():
            shutil.rmtree(self.scratch_dir)

    def test_check_first_player_is_host(self) -> None:
        lobby_manager = LobbyManager(game_manager=self.game_manager)
        game_id = lobby_manager.create_lobby()
        first_player = lobby_manager.join_lobby(game_id=game_id, player_name="Sam")
        assert first_player is not None
        doubled_player = lobby_manager.join_lobby(game_id=game_id, player_name="sam")
        assert doubled_player is None
        second_player = lobby_manager.join_lobby(game_id=game_id, player_name="Cindy")
        assert second_player is not None

        lobby = lobby_manager.get_lobby(game_id=game_id)
        assert lobby is not None
        self.assertEqual(lobby.host_player_id, first_player.player_id)
        self.assertNotEqual(first_player.player_id, second_player.player_id)

    def test_unique_game_ids_are_assigned(self) -> None:
        game_repo = self.game_repo
        game_manager = self.game_manager
        lobby_manager = LobbyManager(game_manager=game_manager)

        game_id = game_manager.new_game(game_repo=game_repo, player_names=["Robbie", "Roman"])
        lobby_game_id = lobby_manager.create_lobby()
        game_id_2 = game_manager.new_game(game_repo=game_repo, player_names=["Robbie", "Roman"])
        lobby_game_id_2 = lobby_manager.create_lobby()
        self.assertEqual(len(set([game_id, lobby_game_id, game_id_2, lobby_game_id_2])), 4)
