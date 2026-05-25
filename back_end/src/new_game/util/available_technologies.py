import os
from pathlib import Path
from typing import Literal


def get_available_technologies(category=Literal["generators", "loads", "transmission"]) -> list[str]:
    path = Path(os.path.dirname(__file__)).parent
    tech_specs_dir = path / f"{category}/tech_specs"
    yaml_files = tech_specs_dir.rglob("*.yaml")
    return [f.stem for f in yaml_files]
