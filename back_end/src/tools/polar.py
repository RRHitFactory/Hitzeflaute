import polars as pl


def reorder(x: pl.DataFrame, ids: list[int]) -> pl.DataFrame:
    sort_keys = pl.DataFrame({"pos": [k for k in range(len(ids))], "id": ids})
    return x.join(sort_keys, on="id").sort(by="pos", descending=False).drop("pos")
