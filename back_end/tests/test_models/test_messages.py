from src.models.ids import AssetId, GameId, PlayerId
from src.models.message import LoadsDeactivatedMessage
from tests.base_test import BaseTest


class TestMessages(BaseTest):
    def test_serialize_deserialize(self) -> None:
        msg = LoadsDeactivatedMessage(game_id=GameId(0), player_id=PlayerId(1), message="Test message", asset_ids=[AssetId(1), AssetId(2)])
        msg_dict = msg.to_simple_dict()
        restored_msg = LoadsDeactivatedMessage.from_simple_dict(msg_dict)
        assert isinstance(restored_msg, LoadsDeactivatedMessage)
        assert isinstance(restored_msg.game_id, GameId)
        assert isinstance(restored_msg.player_id, PlayerId)
        first_aid = restored_msg.asset_ids[0]
        assert isinstance(first_aid, AssetId)
        self.assertEqual(restored_msg.asset_ids, msg.asset_ids)
