from collections.abc import Callable

from src.tools.random_choice import random_choice

__all__ = ["make_trigrams"]
type TrigramFunc = Callable[[str], str | None]


def make_trigrams(names: list[str]) -> list[str]:
    trigrams: list[str] = []

    funcs: list[TrigramFunc] = [
        make_first_last,
        make_first_three,
        make_random_with_first_letter,
        make_random_with_first_letter,
        make_random_with_first_letter,
        make_random_with_first_letter,
        make_random_with_first_letter,
        make_random_with_first_letter,
    ]

    def get_trigram(x: str) -> str:
        nonlocal trigrams

        for func in funcs:
            attempt = func(x)
            if attempt is not None and attempt not in trigrams:
                return attempt
        raise ValueError(f"Could not determine unique trigram for {x}")

    for n in names:
        tri = get_trigram(n)
        trigrams.append(tri)

    return trigrams


def make_first_last(x: str) -> str | None:
    pieces = x.split(" ")
    if len(pieces) < 2:
        return None
    first_piece = pieces[0]
    last_piece = pieces[-1]
    if len(last_piece) >= 2:
        return (first_piece[0] + last_piece[:2]).upper()
    if len(first_piece) >= 2:
        return (first_piece[:2] + last_piece[0]).upper()
    return None


def make_first_three(x: str) -> str | None:
    if len(x) >= 3:
        return x[:3].upper()
    return None


def make_random_with_first_letter(x: str) -> str | None:
    import string

    letters = [l for l in string.ascii_letters]
    return (x[0] + random_choice(letters) + random_choice(letters)).upper()
