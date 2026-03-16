import pandas as pd
import polars as pl

from src.tools.serialization import dataframe_to_dict, dict_to_dataframe, dict_to_polars_dataframe, polars_dataframe_to_dict
from tests.base_test import BaseTest


class TestSerialization(BaseTest):
    def test_df_serialization(self) -> None:
        og_dict = {"a": [1, 2, 3], "b": [4.0, 5.5, 6.1]}
        pd_df = pd.DataFrame(og_dict)
        pl_df = pl.DataFrame(og_dict)
        pd_dict = dataframe_to_dict(pd_df)
        pl_dict = polars_dataframe_to_dict(pl_df)
        self.assertEqual(pd_dict["columns"], pl_dict["columns"])
        self.assertEqual(pd_dict["index"], pl_dict["index"])
        pd_df_2 = dict_to_dataframe(pd_dict)
        pl_df_2 = dict_to_polars_dataframe(pl_dict)
        self.assertTrue((pd_df_2.to_numpy() == pl_df_2.to_numpy()).all())
