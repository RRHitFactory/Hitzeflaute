from fastapi import Request, Response

from src.models.ids import PlayerId

__all__ = ["Cookies"]

PLAYER_ID_COOKIE = "player_id"
PLAYER_NAME_COOKIE = "player_name"


class Cookies:
    @classmethod
    def set_player_id(cls, response: Response, player_id: PlayerId) -> None:
        cls._set_cookie(response, PLAYER_ID_COOKIE, str(player_id))

    @classmethod
    def get_player_id(cls, request: Request) -> PlayerId | None:
        player_id = request.cookies.get(PLAYER_ID_COOKIE)
        if player_id is None:
            return player_id
        return PlayerId(player_id)

    @classmethod
    def set_player_name(cls, response: Response, name: str) -> None:
        cls._set_cookie(response, PLAYER_NAME_COOKIE, name)

    @classmethod
    def get_player_name(cls, request: Request) -> str | None:
        return request.cookies.get(PLAYER_NAME_COOKIE)

    @staticmethod
    def _set_cookie(response: Response, cookie: str, value: str) -> None:
        response.set_cookie(
            key=cookie,
            value=value,
            httponly=True,
            max_age=3600 * 24 * 30,  # 30 days
            samesite="lax",
        )
