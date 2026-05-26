import json
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from agent import parse_user_command

# Initialize the API
app = FastAPI(title="GroundedCompare: NL Request Agent")

# Define the expected incoming payload from the frontend
class FrontendRequest(BaseModel):
    user_prompt: str
    screen_context: str

@app.post("/api/parse-command")
async def parse_command(request: FrontendRequest):
    try:
        # Call the Gemini script
        gemini_response_text = parse_user_command(request.user_prompt, request.screen_context)
        
        # Gemini returns a JSON string, so we parse it into a Python dictionary 
        # before sending it back to the frontend so it formats correctly.
        parsed_json = json.loads(gemini_response_text)
        
        return parsed_json
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI Processing Error: {str(e)}")