from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import FileResponse
import httpx
import os
import re
from typing import Dict
from pydantic import BaseModel
from dotenv import load_dotenv
import asyncio

# Load environment variables from .env file
load_dotenv()

app = FastAPI()
# Serve the favicon.ico file
@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    # Ensure the favicon.ico file exists in the same directory as this script
    favicon_path = os.path.join(os.path.dirname(__file__), "favicon.ico")
    if os.path.exists(favicon_path):
        return FileResponse(favicon_path)
    else:
        return {"error": "favicon.ico not found"}

# Define the models to use for each step with appropriate OpenRouter model IDs
MODELS = {
    "classifier": "mistralai/mistral-7b-instruct:free",
    "interpreter": "google/gemini-2.0-flash-thinking-exp:free",
    "generator": "qwen/qwen2.5-vl-32b-instruct:free",
    "instructTuned": "mistralai/mistral-7b-instruct:free",
    "reviewer": "deepseek/deepseek-r1:free",
}

# Get API key from environment variables
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
if not OPENROUTER_API_KEY:
    print("WARNING: OPENROUTER_API_KEY not found in environment variables!")

# Response models
class SimpleResponse(BaseModel):
    code: str
    steps: Dict[str, str]

class AmbiguousResponse(BaseModel):
    code: str
    feedback: str
    ambiguous: bool = True

class ComplexResponse(BaseModel):
    code: str
    steps: Dict[str, str]

# Utility functions
async def call_openrouter(model: str, input: str) -> str:
    """Reusable function to call OpenRouter API."""
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                json={
                    "model": model,
                    "messages": [{"role": "user", "content": input}],
                    "temperature": 0.5,
                    "max_tokens": 9999,
                },
                headers={
                    "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                    "HTTP-Referer": "https://conv-code-generation-agent.vercel.app",
                    "X-Title": "Code Generation Agent",
                },
            )
            response_data = response.json()
            if response_data and "choices" in response_data and response_data["choices"]:
                return response_data["choices"][0]["message"]["content"]
            else:
                return "Unexpected API response format"
    except Exception as error:
        return f"Failed to generate with {model}. Error: {str(error)}"

async def enhance_code(query: str, code: str) -> str:
    """Reusable function to enhance code."""
    return await call_openrouter(
        MODELS["instructTuned"],
        f"""Improve this code for better performance and readability. Apply any specific customizations 
        mentioned in this request: "{query}"\n\nCode:\n{code}"""
    )

# Prompts dictionary
PROMPTS = {
    "classify_query": lambda query: f"""Analyze this coding request and classify it as "simple", "complex", or "ambiguous".
    - Simple: Basic requests like "Write a Python function to reverse a string."
    - Complex: Requests involving customization, optimization, or multiple features.
    - Ambiguous: Unclear requests lacking specifics.
    Respond with ONLY the word "simple", "complex", or "ambiguous".
    Query: "{query}""",

    "ambiguous_feedback": lambda query: f"""You are a coding assistant. This query is ambiguous or lacks specifics: "{query}". 
    Please provide helpful feedback on what details are needed to generate the code.""",

    "generate_code": lambda query: f"""You are a programming assistant. Generate clean, well-commented, production-ready code for this request: "{query}".""",

    "interpret_query": lambda query: f"""You are a programming assistant. Understand this coding request and convert it into a clear, detailed specification: "{query}".""",

    "select_best": lambda impl1, impl2: f"""You are a code selection expert. Choose the better implementation that is more correct, efficient, and readable.
    IMPLEMENTATION 1:\n{impl1}\n\n
    IMPLEMENTATION 2:\n{impl2}\n\n
    Respond with ONLY the complete selected implementation, no explanation needed.""",
    
    "final_review": lambda code: f"""Review this code and ensure it meets industry best practices, security standards, and handles errors properly.
    Add thorough comments explaining the key components and any optimizations you've made.
    Provide the final, improved version:\n\n{code}""",
}

# Query handlers
async def handle_ambiguous_query(query: str) -> AmbiguousResponse:
    feedback = await call_openrouter(MODELS["interpreter"], PROMPTS["ambiguous_feedback"](query))
    return AmbiguousResponse(
        code=f"{feedback}\n\nPlease provide more details so I can generate the appropriate code for you.",
        feedback=feedback,
    )

async def handle_simple_query(query: str) -> SimpleResponse:
    code = await call_openrouter(MODELS["instructTuned"], PROMPTS["generate_code"](query))
    return SimpleResponse(code=code, steps={"directCode": code})

async def handle_complex_query(query: str) -> ComplexResponse:
    interpretation = await call_openrouter(MODELS["interpreter"], PROMPTS["interpret_query"](query))

    if any(word in interpretation.lower() for word in ["unclear", "ambiguous", "need more information"]):
        return await handle_ambiguous_query(query)

    async def direct_code_path():
        direct_code = await call_openrouter(MODELS["generator"], PROMPTS["generate_code"](query))
        enhanced_direct_code = await enhance_code(query, direct_code)
        return {"directCode": direct_code, "enhancedDirectCode": enhanced_direct_code}

    async def interpreted_code_path():
        interpreted_code = await call_openrouter(MODELS["generator"], PROMPTS["generate_code"](interpretation))
        enhanced_interpreted_code = await enhance_code(query, interpreted_code)
        return {"interpretedCode": interpreted_code, "enhancedInterpretedCode": enhanced_interpreted_code}

    direct_path_result, interpreted_path_result = await asyncio.gather(
        direct_code_path(),
        interpreted_code_path(),
    )

    best_implementation = await call_openrouter(
        MODELS["reviewer"],
        PROMPTS["select_best"](direct_path_result["enhancedDirectCode"], interpreted_path_result["enhancedInterpretedCode"]),
    )

    final_response = await call_openrouter(MODELS["reviewer"], PROMPTS["final_review"](best_implementation))

    steps = {
        "interpretation": interpretation,
        **direct_path_result,
        **interpreted_path_result,
        "bestImplementation": best_implementation,
    }

    return ComplexResponse(code=final_response, steps=steps)

# Main endpoint
@app.get("/generate")
async def generate_code(query: str = Query(..., description="The programming query to process")):
    if not query:
        raise HTTPException(status_code=400, detail="Query is required")

    query_type = await call_openrouter(MODELS["classifier"], PROMPTS["classify_query"](query))
    query_type = re.sub(r'[^a-z]', '', query_type.strip().lower())

    if "ambiguous" in query_type:
        return await handle_ambiguous_query(query)
    elif "simple" in query_type:
        return await handle_simple_query(query)
    else:
        return await handle_complex_query(query)

# Root endpoint for testing
@app.get("/")
async def root():
    return {
        "message": "Code Generation API",
        "usage": "Use GET /generate?query=your programming question",
        "example": "/generate?query=Write a Python function to reverse a string",
    }

# For running the app locally
if __name__ == "__main__":
    if not OPENROUTER_API_KEY:
        print("ERROR: OPENROUTER_API_KEY must be set in .env file or environment variables")
        print("Create a .env file with: OPENROUTER_API_KEY=your_key_here")
        exit(1)
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)