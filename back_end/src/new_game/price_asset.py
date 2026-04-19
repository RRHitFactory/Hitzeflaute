from typing import Literal

import numpy as np
from randcraft import RandomVariable, make_uniform


def price_asset(kind: Literal["load", "gen"], marginal_price: float, expected_power: float, foc: float, lifespan: int, market_prices: RandomVariable | None = None) -> int:
    assert kind in ["load", "gen"]
    if market_prices is None:
        market_prices = make_uniform(low=0, high=800)
    sample_prices = market_prices.sample_numpy(n=100)

    inframarginal_rent = marginal_price * np.ones_like(sample_prices) - sample_prices
    if kind == "load":
        inframarginal_rent = inframarginal_rent * -1

    profit = (inframarginal_rent * expected_power - foc).clip(min=0).mean()

    rng = np.random.default_rng()
    price = profit * lifespan * rng.uniform(low=0.4, high=1.0)
    return round(price)
