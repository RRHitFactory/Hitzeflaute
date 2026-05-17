from abc import ABC, abstractmethod
from collections.abc import Generator, Iterable
from typing import Any, ClassVar, Self

import dataframely as dy
import polars as pl

from src.models.data.light_dc import LightDc
from src.tools.serialization import FlatDict, simplify_type
from src.tools.typing import IntId


class PrSchema(dy.Schema):
    id = dy.Int8(primary_key=True)


class PolarRepo[T_Schema: PrSchema, T_Obj: LightDc, T_Int: int](ABC):
    _validated: ClassVar[bool] = False

    # A dataframe-based repo containing an indexed list of light dataclass objects
    @classmethod
    @abstractmethod
    def get_schema(cls) -> tuple[type[T_Schema], type[T_Obj], type[T_Int]]: ...

    @classmethod
    def _validate_schema(cls) -> None:
        if cls._validated:
            return
        schema, obj_type, int_type = cls.get_schema()
        assert issubclass(schema, dy.Schema)
        assert issubclass(obj_type, LightDc)
        assert issubclass(int_type, IntId)

        dy_schema_columns = schema.columns()
        ldc_schema_fields = obj_type.get_keys()
        assert set(dy_schema_columns) == set(ldc_schema_fields), "Dy schema and object schema mismatch"
        cls._validated = True

    def __init__(self, x: pl.DataFrame | list[T_Obj], quick: bool = False) -> None:
        self._validate_schema()

        schema, obj_type, int_type = self.get_schema()
        self.schema = schema
        self.obj_type = obj_type
        self.int_type = int_type

        if quick:
            assert isinstance(x, pl.DataFrame)
            df = self.schema.cast(x)
        else:
            if isinstance(x, list):
                df = pl.DataFrame([obj.to_simple_dict() for obj in x])
            else:
                df = x
            df = schema.validate(df, cast=True)
        self.df = df

    def __str__(self) -> str:
        return f"<{self.__class__.__name__} ({len(self.df)} rows)>"

    def __repr__(self) -> str:
        return f"{self.__class__.__name__}:\n{repr(self.df)}"

    def __add__[T_PolarRepo: "PolarRepo"](self: T_PolarRepo, other: T_PolarRepo | pl.DataFrame | T_Obj) -> T_PolarRepo:
        if isinstance(other, PolarRepo):
            other_df = other.df
        elif isinstance(other, pl.DataFrame):
            other_df = self.schema.validate(other, cast=True)
        else:
            assert isinstance(other, self.obj_type)
            other_df = self.schema.validate(pl.DataFrame(data=other.to_simple_dict()), cast=True)
        # Do a quick check for unique ids, then skip main validation
        my_ids = self.df["id"].to_list()
        new_ids = other_df["id"].to_list()
        assert len(set(my_ids + new_ids)) == len(my_ids) + len(new_ids), "Ids are not unique"
        return self._make_quick(x=pl.concat([self.df, other_df]))

    def __len__(self) -> int:
        return len(self.df)

    def __eq__(self, other: object, /) -> bool:
        if not isinstance(other, self.__class__):
            return False
        return self.df.equals(other.df)

    def __iter__(self) -> Generator[T_Obj, None, None]:
        for r in self.df.iter_rows(named=True):
            yield self.obj_type.from_simple_dict(r)

    def __getitem__(self, x: int | T_Int) -> T_Obj:
        assert isinstance(x, int)
        reduced_df = self.df.filter(pl.col("id") == int(x))
        if not len(reduced_df):
            a = 2
            raise KeyError(f"Element with id {x} not found in {self.__class__.__name__}")
        simple_dict = [r for r in reduced_df.iter_rows(named=True)][0]
        return self.obj_type.from_simple_dict(simple_dict)

    def _make_quick(self, x: pl.DataFrame) -> Self:
        return self.__class__(x=x, quick=True)

    def next_id(self) -> T_Int:
        # Returns the next available id for a new item
        if len(self.df) == 0:
            return self.int_type(1)
        max_id: int = self.df["id"].max()  # type: ignore
        return self.int_type(max_id + 1)

    # GET
    def get_multiple[T_PolarRepo: "PolarRepo"](self: T_PolarRepo, ids: list[T_Int]) -> T_PolarRepo:
        return self._filter(pl.col("id").is_in([int(y) for y in ids]))

    # UPDATE
    def update_frame[T_PolarRepo: "PolarRepo"](self: T_PolarRepo, df: pl.DataFrame) -> T_PolarRepo:
        return self.__class__(x=df)

    def update_key_value[T_PolarRepo: "PolarRepo"](self: T_PolarRepo, id: T_Int, key: str, value: Any) -> T_PolarRepo:
        return self.update_key_values(id=id, key_values={key: value})

    def update_key_values[T_PolarRepo: "PolarRepo"](self: T_PolarRepo, id: T_Int | list[T_Int], key_values: dict[str, Any]) -> T_PolarRepo:
        key_exprs = {k: pl.lit(simplify_type(v)) for k, v in key_values.items()}
        return self.update_key_expressions(id=id, key_exprs=key_exprs)

    def update_key_expressions[T_PolarRepo: "PolarRepo"](self: T_PolarRepo, id: T_Int | list[T_Int], key_exprs: dict[str, pl.Expr]) -> T_PolarRepo:
        if isinstance(id, list):
            condition = pl.col("id").is_in([int(i) for i in id])
        else:
            condition = pl.col("id") == int(id)
        exprs = [pl.when(condition).then(e).otherwise(pl.col(k)).alias(k) for k, e in key_exprs.items()]
        df = self.df.with_columns(*exprs)
        return self._make_quick(df)

    # DELETE
    def drop_by_ids[T_PolarRepo: "PolarRepo"](self: T_PolarRepo, ids: Iterable[T_Int]) -> T_PolarRepo:
        return self._drop_items(pl.col("id").is_in([int(y) for y in ids]))

    def drop_one[T_PolarRepo: "PolarRepo"](self: T_PolarRepo, id: T_Int) -> T_PolarRepo:
        return self.drop_by_ids([id])

    # MISC
    def _filter[T_PolarRepo: "PolarRepo"](self: T_PolarRepo, expression: pl.Expr | Iterable[pl.Expr]) -> T_PolarRepo:
        return self._make_quick(x=self.df.filter(expression))

    def _drop_items[T_PolarRepo: "PolarRepo"](self: T_PolarRepo, expression: pl.Expr) -> T_PolarRepo:
        return self._make_quick(x=self.df.filter(~expression))

    # CONVERT
    def as_dicts(self) -> list[FlatDict]:
        return [r for r in self.df.iter_rows(named=True)]

    def as_objs(self) -> list[T_Obj]:
        return [self.obj_type.from_simple_dict(r) for r in self.df.iter_rows(named=True)]

    def to_simple_dict(self) -> dict[str, Any]:
        return {"class": self.__class__.__name__, "data": self.as_dicts()}

    @classmethod
    def from_simple_dict[T_PolarRepo: "PolarRepo"](cls: type[T_PolarRepo], data: dict) -> T_PolarRepo:
        # Creates a frame from a dict representation
        assert data["class"] == cls.__name__, f"Class mismatch: {data['class']} != {cls.__name__}"
        return cls(pl.DataFrame(data["data"]))
