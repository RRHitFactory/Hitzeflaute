from dataclasses import dataclass, field
from types import MappingProxyType

from src.models.ids import AssetId, TransmissionId

_empty_mapping = field(default_factory=lambda: MappingProxyType({}))

@dataclass(frozen=True)
class PendingState:
    line_activation: MappingProxyType[TransmissionId, bool] = field(default_factory=lambda: MappingProxyType({}))
    asset_activation: MappingProxyType[AssetId, bool] = field(default_factory=lambda: MappingProxyType({}))

    def update(self, ps: "PendingState") -> "PendingState":
        return PendingState(
            line_activation=self.join_dicts(self.line_activation, ps.line_activation),
            asset_activation=self.join_dicts(self.asset_activation, ps.asset_activation)
        )

    def to_simple_dict(self) -> dict[str, dict]:
        return {
            "line_activation": {k.as_int(): v for k, v in self.line_activation.items()},
            "asset_activation": {k.as_int(): v for k, v in self.asset_activation.items()}
        }

    @classmethod
    def from_simple_dict(self, x: dict) -> "PendingState":
        return PendingState(
            line_activation=MappingProxyType({TransmissionId(k): v for k, v in x["line_activation"].items()}),
            asset_activation=MappingProxyType({AssetId(k): v for k, v in x["asset_activation"].items()})
        )

    @staticmethod
    def join_dicts[T, U](old: MappingProxyType[T, U], new: MappingProxyType[T, U]) -> MappingProxyType[T, U]:
        new_dict = {}
        for d in [old, new]:
            new_dict.update(d)
        return MappingProxyType(new_dict)
