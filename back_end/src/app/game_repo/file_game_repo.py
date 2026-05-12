import threading
from pathlib import Path

from src.app.game_repo.base import BaseGameStateRepo
from src.directories import game_cache_dir
from src.models.game_state import GameState
from src.models.ids import GameId
from src.tools.serialization import deserialize, serialize


class FileGameStateRepo(BaseGameStateRepo):
    RESERVED_IDS_FILE = "reserved_ids.txt"
    _lock = threading.Lock()

    def __init__(self, cache_dir: Path = game_cache_dir) -> None:
        self.cache_dir = cache_dir
        # Ensure cache directory exists
        self.cache_dir.mkdir(parents=True, exist_ok=True)

    def _get_reserved_ids(self) -> set[int]:
        """Read reserved IDs from the reserved_ids.txt file."""
        reserved_file = self.cache_dir / self.RESERVED_IDS_FILE
        if not reserved_file.exists():
            return set()
        try:
            with open(reserved_file) as f:
                return {int(line.strip()) for line in f if line.strip()}
        except (OSError, ValueError):
            return set()

    def _add_reserved_id(self, game_id: GameId) -> None:
        """Append a new reserved ID to the reserved_ids.txt file."""
        reserved_file = self.cache_dir / self.RESERVED_IDS_FILE
        with open(reserved_file, "a") as f:
            f.write(f"{game_id.as_int()}\n")

    def reserve_game_id(self) -> GameId:
        with self._lock:
            # Get IDs from existing game files
            game_ids = self.list_games()

            # Get IDs from reserved file
            reserved_ids = self._get_reserved_ids()

            # Combine all IDs and find the maximum
            all_ids = {gid.as_int() for gid in game_ids} | reserved_ids

            new_id = max(all_ids) + 1 if all_ids else 0
            game_id = GameId(new_id)

            # Record the reserved ID
            self._add_reserved_id(game_id)

            return game_id

    def create(self, game: GameState) -> None:
        path = self.game_id_to_file_path(game.game_id)
        if path.exists():  # Todo make these checks threadsafe
            raise FileExistsError(f"Game with ID {game.game_id} already exists.")
        with open(path, "w") as file:
            file.write(serialize(game))

    def update(self, game: GameState) -> None:
        path = self.game_id_to_file_path(game.game_id)
        if not path.exists():
            raise FileNotFoundError(f"Game with ID {game.game_id} does not exist.")
        with open(path, "w") as file:
            file.write(serialize(game))

    def read(self, game_id: GameId) -> GameState:
        path = self.game_id_to_file_path(game_id)
        if not path.exists():
            raise FileNotFoundError(f"Game with ID {game_id} does not exist.")
        with open(path) as file:
            data = file.read()
        return deserialize(x=data, cls=GameState)

    def list_games(self) -> list[GameId]:
        game_files = self.cache_dir.glob("game_*.json")
        return [self.file_path_to_game_id(file_path) for file_path in game_files if file_path.is_file()]

    def delete(self, game_id: GameId, missing_ok: bool = True) -> None:
        path = self.game_id_to_file_path(game_id)
        path.unlink(missing_ok=missing_ok)

        # Also remove from reserved_ids.txt if present
        with self._lock:
            reserved_file = self.cache_dir / self.RESERVED_IDS_FILE
            if reserved_file.exists():
                try:
                    with open(reserved_file) as f:
                        lines = f.readlines()
                    new_lines = [
                        line for line in lines
                        if line.strip() and int(line.strip()) != game_id.as_int()
                    ]
                    with open(reserved_file, "w") as f:
                        f.writelines(new_lines)
                except (OSError, ValueError):
                    pass

    def game_id_to_file_path(self, game_id: GameId) -> Path:
        """Get the file path for a specific game ID."""
        return self.cache_dir / f"game_{game_id}.json"

    @staticmethod
    def file_path_to_game_id(file_path: Path) -> GameId:
        """Extract the game ID from a file path."""
        if not file_path.name.startswith("game_") or not file_path.name.endswith(".json"):
            raise ValueError(f"Invalid game file name: {file_path.name}")
        game_id_str = file_path.name[len("game_") : -len(".json")]
        return GameId(int(game_id_str))
