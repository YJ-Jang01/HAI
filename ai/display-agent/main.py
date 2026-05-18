import json
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from agent import generate_display_payload

# Initialize the API
app = FastAPI(title="GroundedCompare: Display Agent")

# Define the expected incoming payload from the backend
class BackendDisplayRequest(BaseModel):
    target_items: list[str]
    feature_focus: str
    raw_reviews: str

@app.post("/api/generate-display")
async def generate_display(request: BackendDisplayRequest):
    try:
        # Call the Gemini script
        gemini_response_text = generate_display_payload(
            request.target_items, 
            request.feature_focus, 
            request.raw_reviews
        )
        
        # Parse the JSON string into a dictionary for the HTTP response
        parsed_json = json.loads(gemini_response_text)
        
        return parsed_json
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI Processing Error: {str(e)}")