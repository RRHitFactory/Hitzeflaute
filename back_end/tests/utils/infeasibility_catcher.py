import logging
import os
import uuid
from contextlib import contextmanager

from src.app.simple_front_end.plotting.grid_plotter import GridPlotter
from src.directories import test_dir
from src.engine.market_coupling import OptimizationError, MarketCouplingCalculator
from src.models.game_state import GameState
from src.tools.serialization import serialize, deserialize

logger = logging.getLogger(__name__)
bad_state_dir = test_dir / "bad_states"


@contextmanager
def infeasibility_catcher():
    try:
        yield
    except OptimizationError as e:
        name = f"bad_state_{e.game_state.game_id.as_int()}_{uuid.uuid4()}.json"
        path = bad_state_dir / name
        with open(path, "w") as f:
            f.write(serialize(e.game_state))
        logger.error(f"OptimizationError caught. Game state saved to {path}")
        raise e


def check_infeasible_states():
    for f in os.scandir(bad_state_dir):
        if not (f.is_file() and f.name.endswith(".json")):
            continue
        print(f"Found bad state file: {f.name}")
        with open(f.path, "r") as file:
            content = file.read()
        game_state = deserialize(x=content, cls=GameState)
        GridPlotter().make_figure(game_state=game_state).show()
        MarketCouplingCalculator.run(game_state)


if __name__ == "__main__":
    check_infeasible_states()
