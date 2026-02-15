from pathlib import Path

src_dir = Path(__file__).parent
backend_root_dir = src_dir.parent
game_cache_dir = src_dir / "game_cache"
test_dir = backend_root_dir / "tests"
