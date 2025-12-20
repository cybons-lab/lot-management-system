from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class LayerCodeBase(BaseModel):
    maker_name: str = Field(..., max_length=100)


class LayerCodeCreate(LayerCodeBase):
    layer_code: str = Field(..., max_length=50)


class LayerCodeUpdate(LayerCodeBase):
    pass


class LayerCodeResponse(LayerCodeBase):
    layer_code: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
