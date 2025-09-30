from typing import TypeVar

import numpy as np
from numpy.random import Generator

T = TypeVar("T")


def random_choice_multi(x: list[T], size: int, generator: Generator | None = None, **kwargs) -> list[T]:
    if generator is None:
        generator = np.random.default_rng()
    ixs = generator.choice(a=[k for k in range(len(x))], size=size, **kwargs)
    return [x[ix] for ix in ixs]


def random_choice(x: list[T], generator: Generator | None = None) -> T:
    if generator is None:
        generator = np.random.default_rng()
    return random_choice_multi(x=x, size=1, generator=generator)[0]
