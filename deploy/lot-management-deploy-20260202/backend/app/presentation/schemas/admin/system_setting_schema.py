from pydantic import BaseModel, Field


class SystemSettingBase(BaseModel):
    config_key: str = Field(..., description="設定キー")
    config_value: str = Field(..., description="設定値")
    description: str | None = Field(None, description="説明")


class SystemSettingResponse(SystemSettingBase):
    id: int | None = Field(None, description="設定ID（DBに保存されていない場合はNone）")

    class Config:
        """Pydantic config."""

        from_attributes = True


class SystemSettingUpdate(BaseModel):
    config_value: str = Field(..., description="設定値")
    description: str | None = Field(None, description="説明")
