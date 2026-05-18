from pydantic import BaseModel, Field

class NlIntentRequest(BaseModel):
    intent: str = Field(description="The user's core intent (e.g., 'compare', 'filter', 'repair', 'select')")
    target_item_ids: list[str] = Field(description="List of specific product IDs the user is referring to")
    feature_focus: str | None = Field(description="Specific feature mentioned, like 'battery life' or 'price'. Null if none.", default=None)
    requires_disambiguation: bool = Field(description="True if the user's command is too vague to confidently map to visible items on screen")
    follow_up_question: str | None = Field(description="A short clarification question to ask the user if requires_disambiguation is True", default=None)