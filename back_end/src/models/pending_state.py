from dataclasses import dataclass, field
from types import MappingProxyType
from typing import ClassVar

from src.models.ids import AssetId, TransmissionId


@dataclass(frozen=True)
class PendingState:
    line_activation: MappingProxyType[TransmissionId, bool] = field(default_factory=lambda: MappingProxyType({}))
    asset_activation: MappingProxyType[AssetId, bool] = field(default_factory=lambda: MappingProxyType({}))
    bids: MappingProxyType[AssetId, float] = field(default_factory=lambda: MappingProxyType({}))

    @classmethod
    def get_field_names_and_types(cls) -> dict[str, type]:
        return {"line_activation": TransmissionId, "asset_activation": AssetId, "bids": AssetId}

    def update(self, ps: "PendingState") -> "PendingState":
        return PendingState(
            line_activation=self.join_dicts(self.line_activation, ps.line_activation),
            asset_activation=self.join_dicts(self.asset_activation, ps.asset_activation),
            bids=self.join_dicts(self.bids, ps.bids),
        )

    def to_simple_dict(self) -> dict[str, dict]:
        return {
            "line_activation": {k.as_int(): v for k, v in self.line_activation.items()},
            "asset_activation": {k.as_int(): v for k, v in self.asset_activation.items()},
            "bids": {k.as_int(): v for k, v in self.bids.items()},
        }

    @classmethod
    def from_simple_dict(cls, x: dict) -> "PendingState":
        return PendingState(
            line_activation=MappingProxyType({TransmissionId(k): v for k, v in x["line_activation"].items()}),
            asset_activation=MappingProxyType({AssetId(k): v for k, v in x["asset_activation"].items()}),
            bids=MappingProxyType({AssetId(k): v for k, v in x["bids"].items()}),
        )

    @staticmethod
    def join_dicts[T, U](old: MappingProxyType[T, U], new: MappingProxyType[T, U]) -> MappingProxyType[T, U]:
        new_dict: dict[T, U] = {}
        for d in [old, new]:
            new_dict.update(d)
        return MappingProxyType(new_dict)
