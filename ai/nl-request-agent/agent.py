import sys
import os

# Dynamically route to the shared folder
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from shared.models import NlIntentRequest
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()
api_key = os.environ.get("GEMINI_API_KEY")

if not api_key:
    print("❌ ERROR: Could not find GEMINI_API_KEY. Check your .env file!")
    exit()

client = genai.Client(api_key=api_key)

def parse_user_command(user_prompt: str, screen_context: str) -> str:
    """
    Takes an ambiguous user command and visible screen items,
    and returns a structured JSON intent using Gemini 3.1 Flash-Lite.
    """
    
    system_instruction = (
        "You are the Natural Language Request Agent for GroundedCompare, a data-driven e-commerce UI. "
        "Your job is to translate ambiguous user commands into a structured backend API request. "
        "CRITICAL INSTRUCTION: You must perform 'range-aware reasoning'. When a user uses subjective terms "
        "(e.g., 'not too expensive', 'highly rated', 'lightweight'), you must map them into the `rangeConstraints` "
        "dictionary. You must provide a concrete, logical `numeric_interpretation` (e.g., '< $120' or 'top 30%') "
        "for the backend to execute. Do not leave subjective terms as vague preferences. "
        "For `selectedItems`, map exact screen numbers to 'visible_number' and descriptive phrases to 'attribute_query'. "
        "Strictly output valid JSON matching the requested schema without markdown or conversational filler."
    )
    
    prompt = f"""
    Screen Context (Visible Items and general price/rating ranges):
    {screen_context}
    
    User Command: {user_prompt}
    
    Analyze the command. If subjective constraints exist, assign realistic numeric boundaries based on standard e-commerce expectations.
    """
    
    response = client.models.generate_content(
        model="gemini-3.1-flash-lite",
        contents=prompt,
        config=types.GenerateContentConfig(
            system_instruction=system_instruction,
            response_mime_type="application/json",
            response_schema=NlIntentRequest,
            temperature=0.0 
        ),
    )
    
    return response.text

# --- Example Usage ---
if __name__ == "__main__":
    # Updated mock context to match the "winter coats" query
    mock_screen_context = (
        "Current Category: Outerwear. Price range on screen: $45 to $350. Average rating: 4.1.\n"
        "- ID: coat_01, Name: North Face Parka, Price: $299, Rating: 4.8, Position: Top Left\n"
        "- ID: coat_02, Name: Basic Wool Blend, Price: $89, Rating: 3.5, Position: Top Right\n"
        "- ID: coat_03, Name: Columbia Puffer, Price: $110, Rating: 4.5, Position: Bottom Left\n"
    )
    
    mock_user_command = "Show me warm winter coats that are not too expensive and have good reviews"
    
    result = parse_user_command(mock_user_command, mock_screen_context)
    print(result)