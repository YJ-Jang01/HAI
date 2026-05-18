from pydantic import BaseModel, Field
from typing import Literal

class EvidenceOverlay(BaseModel):
    item_id: str = Field(description="The ID of the product this overlay belongs to")
    summary: str = Field(description="A concise, 1-2 sentence micro-summary of the feature focus based on the reviews.")
    evidence_snippet: str = Field(description="A short, direct quote or highly specific detail from the reviews proving the summary.")
    sentiment: Literal["positive", "neutral", "negative"] = Field(description="Overall sentiment regarding the feature focus.")

class DisplayResponse(BaseModel):
    overlays: list[EvidenceOverlay] = Field(description="List of overlays to render on the result grid.")