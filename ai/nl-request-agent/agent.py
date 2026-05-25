import os
from google import genai
from google.genai import types
from models import NlIntentRequest
from dotenv import load_dotenv

load_dotenv()

# Initialize the Gemini client
# Ensure you have your GEMINI_API_KEY in a .env file
client = genai.Client()

def parse_user_command(user_prompt: str, screen_context: str) -> str:
    """
    Takes an ambiguous user command and visible screen items,
    and returns a structured JSON intent using Gemini 3.1 Flash-Lite.
    """
    
    # System instruction sets the persona and rules
    system_instruction = (
        "You are the AI interaction parser for GroundedCompare, a dense e-commerce UI. "
        "Your job is to map the user's natural language command to the provided visible screen context. "
        "Strictly output valid JSON adhering to the requested schema. Do not include markdown formatting or conversational filler."
    )
    
    # The prompt bundles the user's instruction with the UI state
    prompt = f"Screen Context (Visible Items):\n{screen_context}\n\nUser Command: {user_prompt}"
    
    # Call Gemini 3.1 Flash-Lite using the GA model ID
    response = client.models.generate_content(
        model="gemini-3.1-flash-lite",
        contents=prompt,
        config=types.GenerateContentConfig(
            system_instruction=system_instruction,
            response_mime_type="application/json",
            response_schema=NlIntentRequest,
            temperature=0.0 # Keep temperature at 0 for deterministic routing
        ),
    )
    
    return response.text

# --- Example Usage ---
if __name__ == "__main__":
    # Mock context of what is currently rendered on the user's screen
    mock_screen_context = (
        "- ID: prod_101, Name: Sony WH-1000XM5, Position: Top Left, Color: Black\n"
        "- ID: prod_102, Name: Apple AirPods Max, Position: Top Right, Color: Silver\n"
        "- ID: prod_103, Name: Bose QuietComfort, Position: Bottom Left, Color: Blue\n"
    )
    
    # Ambiguous user command
    mock_user_command = "compare the blue one and the one above it for battery life"
    
    result = parse_user_command(mock_user_command, mock_screen_context)
    print(result)