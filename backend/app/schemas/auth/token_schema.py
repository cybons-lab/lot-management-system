from pydantic import BaseModel


class Token(BaseModel):
    """JWT Token schema."""

    access_token: str
    token_type: str


class TokenData(BaseModel):
    """Data embedded in the token."""

    username: str | None = None
