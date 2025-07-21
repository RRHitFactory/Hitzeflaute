from typing import Self

from src.tools.typing import IntId


class GameId(IntId):
    pass


class PlayerId(IntId):
    @property
    def is_npc(self) -> bool:
        return self == PlayerId.get_npc()

    @classmethod
    def get_npc(cls) -> Self:  # noqa
        return cls(-1)


class AssetId(IntId):
    pass


class BusId(IntId):
    pass


class TransmissionId(IntId):
    pass
