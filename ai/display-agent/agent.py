import sys
import os

# Add the parent directory to the system path so Python can find the 'shared' folder dynamically
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from shared.models import DisplayResponse
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()
api_key = os.environ.get("GEMINI_API_KEY")

if not api_key:
    print("❌ ERROR: Could not find GEMINI_API_KEY. Check your .env file!")
    exit()

client = genai.Client(api_key=api_key)


def generate_display_payload(target_items: list[str], feature_focus: str, raw_reviews: str) -> str:
    """
    Takes raw reviews from the database and generates UI-ready 
    micro-summaries and evidence snippets for the GroundedCompare interface.
    """
    
    system_instruction = (
        "You are the Display Agent for GroundedCompare. Your job is to take raw backend product data "
        "and format it into UI-ready evidence overlays and a comparison tray. "
        "CRITICAL INSTRUCTION: You must populate the `transparency_statement` to explicitly explain "
        "how you interpreted the user's subjective constraints based on the data (e.g., 'AI interpreted "
        "your request as: Price under $120 and Rating above 4.3'). "
        "Determine the correct `displayMode`: use 'in_place_overlay' for standard multi-item summaries, "
        "or 'nested_detail' if the user asked a highly specific follow-up comparing a specific feature. "
        "Populate the `detailedComparison` field if in 'nested_detail' mode. "
        "Populate the `tray` with the IDs of the items currently being compared. "
        "Strictly output valid JSON matching the requested schema."
    )
    
    prompt = f"""
    Target Items: {target_items}
    User's Feature Focus / Constraints: {feature_focus}
    
    Raw Backend Reviews & API Data:
    {raw_reviews}
    
    Generate the display payload. Ensure the transparency statement clearly justifies any range-based decisions.
    """
    
    response = client.models.generate_content(
        model="gemini-3.1-flash-lite",
        contents=prompt,
        config=types.GenerateContentConfig(
            system_instruction=system_instruction,
            response_mime_type="application/json",
            response_schema=DisplayResponse,
            temperature=0.2 # Slight temperature for better natural language summarization, but still grounded
        ),
    )
    
    return response.text

# --- Example Usage ---
if __name__ == "__main__":
    # Mock data that the backend would normally pull from Supabase
    mock_items = ["prod_101", "prod_103"]
    mock_focus = "battery life"
    mock_raw_reviews = (
        "prod_101 (Sony): 'Battery easily lasts my whole 8 hour shift.', 'I get about 30 hours of playback.', 'Battery degraded slightly after a year.'\n"
        "prod_103 (Bose): 'Battery dies after 15 hours.', 'Disappointed in the battery life compared to others.', 'Needs charging frequently on long flights.'"
    )
    
    result = generate_display_payload(mock_items, mock_focus, mock_raw_reviews)
    print(result)