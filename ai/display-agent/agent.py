import sys
import os
# Add the parent directory to the system path so Python can find 'shared'
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), 'C:\Users\COM\Desktop\HAI Project\HAI\ai\shared')))

from shared.models import DisplayResponse
from google import genai
from google.genai import types
from models import DisplayResponse
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
        "You are the Display Agent for GroundedCompare, an e-commerce interface. "
        "Your job is to read raw product reviews and generate highly concise, objective micro-summaries "
        "and extract evidence snippets for specific products based on the user's feature focus. "
        "The text will be displayed in small UI overlays, so it must be brief. "
        "Do not invent information; only use the provided raw reviews. "
        "Strictly output valid JSON matching the requested schema."
    )
    
    prompt = f"""
    Target Items: {target_items}
    Feature Focus: {feature_focus}
    
    Raw Reviews Data:
    {raw_reviews}
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