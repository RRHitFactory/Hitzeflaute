from src.models.assets import AssetPolarRepo
from src.models.ids import AssetId, BusId


def get_asset_locations(assets: AssetPolarRepo, bus_ids: list[BusId]) -> dict[BusId, list[AssetId]]:
    return {b: assets.get_all_assets_at_bus(b).asset_ids for b in bus_ids}
