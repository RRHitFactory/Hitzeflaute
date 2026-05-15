from src.models.assets import AssetRepo
from src.models.ids import AssetId, BusId


def get_asset_locations(assets: AssetRepo, bus_ids: list[BusId]) -> dict[BusId, list[AssetId]]:
    return {b: assets.get_all_assets_at_bus(b).asset_ids for b in bus_ids}
