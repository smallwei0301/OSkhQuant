from pydantic import BaseModel, Field, ConfigDict


class RiskCheckRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    position: int = Field(ge=0)
    max_position: int = Field(ge=0, alias="maxPosition")
    open_orders: int = Field(ge=0, alias="openOrders")
    max_orders: int = Field(ge=0, alias="maxOrders")
    floating_loss: float = Field(ge=0, alias="floatingLoss")
    loss_limit: float = Field(ge=0, alias="lossLimit")


class RiskCheckResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    passed: bool
    reasons: list[str] = Field(default_factory=list)


__all__ = ["RiskCheckRequest", "RiskCheckResponse"]
