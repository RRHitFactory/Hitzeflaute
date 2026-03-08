from typing import Literal

import dataframely as dy
import polars as pl

type PnlCat = Literal["operation", "market", "transmission"]


class PnlFrameSchema(dy.Schema):
    cat = dy.String()
    player_id = dy.Int8()
    thing_id = dy.UInt8()  # Asset or transmission id
    cashflow = dy.Float32()

    @dy.rule()
    def valid_kind(cls) -> pl.Expr:
        return pl.col("cat").is_in(["operation", "market", "transmission"])


type PnlFrame = dy.DataFrame[PnlFrameSchema]
