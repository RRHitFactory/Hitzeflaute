from collections.abc import Callable

import numpy as np

from src.models.random_variable import RandomVariable

from .pdfs import *

__all__ = [
    "make_discrete",
    "make_dirac",
    "make_anon",
    "make_normal",
    "make_uniform",
]


def make_discrete(values: list[float], probabilities: list[float] | None = None) -> RandomVariable:
    # If probabilities are not provided, equal probabilities are assumed
    return RandomVariable(pdf=DiscreteDistributionFunction(values=values, probabilities=probabilities))


def make_dirac(value: float) -> RandomVariable:
    return RandomVariable(pdf=DiracDeltaDistributionFunction(value=value))


def make_anon(sampler: Callable[[int], np.ndarray]) -> RandomVariable:
    return RandomVariable(pdf=AnonymousDistributionFunction(sampler=sampler))


def make_normal(mean: float, std_dev: float) -> RandomVariable:
    return RandomVariable(pdf=NormalDistributionFunction(mean=mean, std_dev=std_dev))


def make_uniform(low: float, high: float) -> RandomVariable:
    return RandomVariable(pdf=UniformDistributionFunction(low=low, high=high))
