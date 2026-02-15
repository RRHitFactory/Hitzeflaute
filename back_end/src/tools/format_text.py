def format_money(amount: float, per_mwh: bool = False) -> str:
    unit = "€"
    if per_mwh:
        unit = "€/MWh"
    return f"{amount:.0f} {unit}"


def format_price(amount: float) -> str:
    return format_money(amount=amount, per_mwh=True)
