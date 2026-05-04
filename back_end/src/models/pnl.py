from typing import Literal

import dataframely as dy
import polars as pl

type PnlCat = Literal["operation", "market", "congestion"]


class PnlFrameSchema(dy.Schema):
    cat = dy.String()  # operation, market, congestion
    player_id = dy.Int8()
    asset_id = dy.UInt8(nullable=True)
    transmission_id = dy.UInt8(nullable=True)
    cashflow = dy.Float32()  # Positive = Profit

    @dy.rule()
    def valid_kind(cls) -> pl.Expr:
        return pl.col("cat").is_in(["operation", "market", "congestion"])

    @dy.rule()
    def one_id(cls) -> pl.Expr:
        return (pl.col("asset_id").is_null().cast(pl.Int8) + pl.col("transmission_id").is_null().cast(pl.Int8)) == 1


type PnlFrame = dy.DataFrame[PnlFrameSchema]
