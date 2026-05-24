from typing import Literal

import dataframely as dy
import polars as pl

from src.ids import AssetId, PlayerId

type PnlCat = Literal["operation", "market", "congestion"]


class PnlFrameSchema(dy.Schema):
    cat = dy.String(max_length=10)  # operation, market, congestion
    player_id = PlayerId._get_dy_column()
    asset_id = AssetId._get_dy_column(nullable=True)
    transmission_id = dy.UInt16(nullable=True)
    cashflow = dy.Float32()  # Positive = Profit

    @dy.rule()
    def valid_kind(cls) -> pl.Expr:
        return pl.col("cat").is_in(["operation", "market", "congestion"])

    @dy.rule()
    def one_id(cls) -> pl.Expr:
        # Either one asset id or one transmission id should be provided
        return pl.col("asset_id").is_null().xor(pl.col("transmission_id").is_null())


type PnlFrame = dy.DataFrame[PnlFrameSchema]
