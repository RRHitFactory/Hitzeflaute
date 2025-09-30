from typing import TypeVar

import numpy as np
from numpy.random import Generator

T = TypeVar("T")


def random_choice_multi[T](x: list[T], size: int, generator: Generator | None = None, replace: bool = True, **kwargs) -> list[T]:
    if generator is None:
        generator = np.random.default_rng()
    ixs = generator.choice(a=[k for k in range(len(x))], size=size, replace=replace, **kwargs)
    return [x[ix] for ix in ixs]


def random_choice[T](x: list[T], generator: Generator | None = None) -> T:
    if generator is None:
        generator = np.random.default_rng()
    return random_choice_multi(x=x, size=1, generator=generator)[0]
