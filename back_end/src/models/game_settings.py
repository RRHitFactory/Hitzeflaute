from dataclasses import dataclass, field
from typing import Literal, Self

from src.models.geometry import Point, Shape, ShapeType
from src.models.technology_settings import MakeTechSettings, TechnologySettingsRepo

type TurnType = Literal["hotseat", "online"]
type BusTopology = Literal["line", "grid", "random", "regular_polygon", "layered_polygon"]
type TransmissionTopology = Literal["sequential", "random", "grid", "spiderweb"]


@dataclass(frozen=True)
class GameSettings:
    turn_type: TurnType = "hotseat"
    bus_topology: BusTopology = "layered_polygon"
    transmission_topology: TransmissionTopology = "spiderweb"
    n_buses: int = 5
    max_rounds: int = 20
    n_init_ice_cream: int = 5
    n_init_assets: int = 10
    n_init_non_freezer_loads: int = 4
    min_bid_price: float = -1000
    max_bid_price: float = 1000
    initial_funds: int = 10000
    enable_fixed_costs: bool = False
    loads: TechnologySettingsRepo = field(default_factory=MakeTechSettings.create_default_load_tech_settings)
    generators: TechnologySettingsRepo = field(default_factory=lambda: MakeTechSettings.create_default_generator_settings())
    transmission: TechnologySettingsRepo = field(default_factory=lambda: MakeTechSettings.create_default_transmission_settings())
    probability_of_new_asset: float = 0.2
    probability_of_new_transmission: float = 0.0
    probability_of_new_bus: float = 0.0
    map_area: Shape = field(default_factory=lambda: Shape.make_rectangle(bottom_left=Point(-30, -15), top_right=Point(30, 15)))

    def __post_init__(self) -> None:
        assert self.map_area.shape_type is ShapeType.Rectangle
        assert not self.map_area.is_closed

    def to_simple_dict(self) -> dict:
        """Convert the game settings to a simple dictionary."""
        return {
            "turn_type": self.turn_type,
            "bus_topology": self.bus_topology,
            "transmission_topology": self.transmission_topology,
            "n_buses": self.n_buses,
            "max_rounds": self.max_rounds,
            "n_init_ice_cream": self.n_init_ice_cream,
            "n_init_assets": self.n_init_assets,
            "min_bid_price": self.min_bid_price,
            "max_bid_price": self.max_bid_price,
            "initial_funds": self.initial_funds,
            "enable_fixed_costs": self.enable_fixed_costs,
            "load_tech_settings": self.loads.to_simple_dict(),
            "generator_tech_settings": self.generators.to_simple_dict(),
            "transmission_tech_settings": self.transmission.to_simple_dict(),
            "probability_of_new_asset": self.probability_of_new_asset,
            "probability_of_new_transmission": self.probability_of_new_transmission,
            "probability_of_new_bus": self.probability_of_new_bus,
            "map_area": self.map_area.to_simple_dict(),
        }

    @classmethod
    def from_simple_dict(cls, simple_dict: dict) -> Self:
        """Create a GameSettings instance from a simple dictionary."""
        return cls(
            turn_type=simple_dict["turn_type"],
            bus_topology=simple_dict["bus_topology"],
            transmission_topology=simple_dict["transmission_topology"],
            n_buses=simple_dict["n_buses"],
            max_rounds=simple_dict["max_rounds"],
            n_init_ice_cream=simple_dict["n_init_ice_cream"],
            n_init_assets=simple_dict["n_init_assets"],
            min_bid_price=simple_dict["min_bid_price"],
            max_bid_price=simple_dict["max_bid_price"],
            initial_funds=simple_dict["initial_funds"],
            enable_fixed_costs=simple_dict["enable_fixed_costs"],
            loads=TechnologySettingsRepo.from_simple_dict(simple_dict["load_tech_settings"]),
            generators=TechnologySettingsRepo.from_simple_dict(simple_dict["generator_tech_settings"]),
            transmission=TechnologySettingsRepo.from_simple_dict(simple_dict["transmission_tech_settings"]),
            probability_of_new_asset=simple_dict["probability_of_new_asset"],
            probability_of_new_transmission=simple_dict["probability_of_new_transmission"],
            probability_of_new_bus=simple_dict["probability_of_new_bus"],
            map_area=Shape.from_simple_dict(simple_dict["map_area"]),
        )
