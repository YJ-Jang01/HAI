from pydantic import BaseModel, Field
from typing import List, Literal, Union

# ==========================================
# NL Request Agent Contracts
# ==========================================
class RangeConstraint(BaseModel):
    parameter_name: str = Field(description="The specific feature being constrained, e.g., 'price' or 'rating'")
    type: Literal["soft_range", "hard_limit"]
    meaning: str
    numeric_interpretation: str | None = Field(description="e.g., '< $120' or 'top 30%'")

class SelectedItem(BaseModel):
    type: Literal["visible_number", "attribute_query", "direct_id"]
    value: Union[str, int]

class ParsedCriterionHint(BaseModel):
    key: str = Field(description="Allowed backend attribute key or base field, e.g. style, season, occasion, price")
    label: str
    value: str | None = None
    status: Literal["applied", "ambiguous", "open"]

class ClarificationOptionHint(BaseModel):
    value: str
    label: str

class ClarificationHint(BaseModel):
    key: str
    question: str
    options: List[ClarificationOptionHint]

class NlIntentRequest(BaseModel):
    intent: str
    category: str | None = None
    productType: str | None = None
    selectedItems: List[SelectedItem]
    preferences: List[str]
    # FIX: Changed from Dict to List to satisfy Gemini Developer API constraints
    rangeConstraints: List[RangeConstraint] = Field(default_factory=list)
    parsedCriteria: List[ParsedCriterionHint] = Field(default_factory=list)
    clarifications: List[ClarificationHint] = Field(default_factory=list)

# ==========================================
# Display Agent Contracts
# ==========================================
class EvidenceOverlay(BaseModel):
    itemId: str
    summary: str
    evidenceCount: int
    snippets: List[str]
    detailedComparison: str | None = Field(description="Used for Level 2 specific comparisons", default=None)

class ComparisonTray(BaseModel):
    items: List[str]
    criteria: List[str]

class DisplayResponse(BaseModel):
    displayMode: Literal["in_place_overlay", "nested_detail", "command_repair"]
    transparency_statement: str = Field(description="e.g., 'AI interpreted your request as: Price under $120...'")
    overlays: List[EvidenceOverlay]
    tray: ComparisonTray
