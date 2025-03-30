from fastapi import FastAPI, HTTPException, Query
import httpx
import os
import re
from typing import Dict, Any, Optional
from pydantic import BaseModel
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

app = FastAPI()

# Define the models to use for each step with appropriate OpenRouter model IDs
MODELS = {
    "classifier": "mistralai/mistral-7b-instruct:free",   # For classifying query complexity
    "interpreter": "google/gemini-2.0-flash-thinking-exp:free", # For understanding complex queries
    "generator": "qwen/qwen2.5-vl-32b-instruct:free",     # For code generation  
    "instructTuned": "mistralai/mistral-7b-instruct:free", # For customization and enhancement
    "reviewer": "deepseek/deepseek-r1:free",              # For final review
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

@app.get("/generate")
async def generate_code(query: str = Query(..., description="The programming query to process")):
    try:
        if not query:
            raise HTTPException(status_code=400, detail="Query is required")

        print("Processing query:", query)

        # STEP 1: Query Classification - Determine complexity
        print("Classifying query complexity...")
        complexity_analysis = await call_openrouter(
            MODELS["classifier"],
            f"""Analyze this coding request and classify it as "simple" or "complex" or "ambiguous".
            - Simple: Basic requests like "Write a Python function to reverse a string."
            - Complex: Requests involving customization, optimization, or multiple features.
            - Ambiguous: Unclear requests lacking specifics.
            Respond with ONLY the word "simple", "complex", or "ambiguous".
            Query: "{query}"""
        )

        query_type = re.sub(r'[^a-z]', '', complexity_analysis.strip().lower())
        print("Query classified as:", query_type)

        # Process based on complexity
        if "ambiguous" in query_type:
            return await handle_ambiguous_query(query)
        elif "simple" in query_type:
            return await handle_simple_query(query)
        else:
            return await handle_complex_query(query)

    except Exception as error:
        print("Error in code generation:", error)
        raise HTTPException(status_code=500, detail=f"Failed to generate code: {str(error)}")

async def handle_ambiguous_query(query: str):
    print("Processing ambiguous query...")
    feedback = await call_openrouter(
        MODELS["interpreter"],
        f"""You are a coding assistant. This query is ambiguous or lacks specifics: "{query}". 
        Please provide helpful feedback on what details are needed to generate the code.
        Be specific about what information is missing (e.g., programming language, input/output format, etc.)."""
    )

    print("Ambiguous query feedback:", feedback)

    return AmbiguousResponse(
        code=f" {feedback}\n\nPlease provide more details so I can generate the appropriate code for you.",
        feedback=feedback
    )

async def handle_simple_query(query: str):
    print("Processing simple query with single model...")
    
    code = await call_openrouter(
        MODELS["instructTuned"],
        f"""You are a programming assistant. Generate clean, well-commented, production-ready code for this request: "{query}".
        Include proper error handling and follow best practices for the chosen programming language.
        Focus on writing efficient, readable code that directly addresses the request."""
    )
    
    print(f"Simple query result: {code[:100]}...")
    
    return SimpleResponse(
        code=code,
        steps={"directCode": code}
    )

async def handle_complex_query(query: str):
    print("Processing complex query with full pipeline...")
    
    # STEP 1: Get detailed interpretation
    print("Getting detailed interpretation...")
    interpretation = await call_openrouter(
        MODELS["interpreter"],
        f"""You are a programming assistant. Understand this coding request and convert it into a clear, detailed specification: "{query}"""
    )
    
    print(f"Interpretation complete: {interpretation[:150]}...")
    
    # Check if interpretation reveals ambiguity
    if any(word in interpretation.lower() for word in ["unclear", "ambiguous", "need more information"]):
        print("Interpretation indicates ambiguity, redirecting to ambiguous handler")
        return await handle_ambiguous_query(query)

    # STEP 2-4: Run the remaining steps in parallel paths for efficiency
    print("Running parallel processing paths...")
    try:
        # PATH 1: Direct code generation with enhancement
        async def direct_code_path():
            print("PATH 1: Starting direct code generation")
            # Generate code directly from query
            direct_code = await call_openrouter(
                MODELS["generator"],
                f"""You are a code generation expert. Generate clean, well-commented, production-ready code for: "{query}".
                Include proper error handling and follow best practices."""
            )
            
            print("PATH 1: Starting code enhancement")
            # Enhance direct code
            enhanced_direct_code = await call_openrouter(
                MODELS["instructTuned"],
                f"""Improve this code for better performance and readability. Apply any specific customizations 
                mentioned in this request: "{query}"\n\nCode:\n{direct_code}"""
            )
            
            print("PATH 1: Complete")
            return {"directCode": direct_code, "enhancedDirectCode": enhanced_direct_code}
        
        # PATH 2: Interpreted code generation with enhancement
        async def interpreted_code_path():
            print("PATH 2: Starting interpreted code generation")
            # Generate code from interpretation
            interpreted_code = await call_openrouter(
                MODELS["generator"],
                f"""Generate clean, well-commented code based on this specification: "{interpretation}"""
            )
            
            print("PATH 2: Starting code enhancement")
            # Enhance interpreted code
            enhanced_interpreted_code = await call_openrouter(
                MODELS["instructTuned"],
                f"""Improve this code for better performance, readability, and error handling:\n\n{interpreted_code}"""
            )
            
            print("PATH 2: Complete")
            return {"interpretedCode": interpreted_code, "enhancedInterpretedCode": enhanced_interpreted_code}

        import asyncio
        direct_path_result, interpreted_path_result = await asyncio.gather(
            direct_code_path(),
            interpreted_code_path()
        )
        
        # STEP 5: Select the best implementation
        print("Selecting best implementation...")
        selection_prompt = f"""You are a code selection expert. Choose the better implementation that is more correct, efficient, and readable.
        IMPLEMENTATION 1:\n{direct_path_result['enhancedDirectCode']}\n\n
        IMPLEMENTATION 2:\n{interpreted_path_result['enhancedInterpretedCode']}\n\n
        Respond with ONLY the complete selected implementation, no explanation needed."""
        
        best_implementation = await call_openrouter(MODELS["reviewer"], selection_prompt)
        print("Best implementation selected.")
        
        # STEP 6: Final review and polishing
        print("Performing final code review...")
        final_response = await call_openrouter(
            MODELS["reviewer"],
            f"""Review this code and ensure it meets industry best practices, security standards, and handles errors properly.
            Add thorough comments explaining the key components and any optimizations you've made.
            Provide the final, improved version:\n\n{best_implementation}"""
        )
        
        print("Final response generated. Process complete.")

        # Combine all steps for the response
        steps = {
            "interpretation": interpretation,
            "directCode": direct_path_result["directCode"],
            "interpretedCode": interpreted_path_result["interpretedCode"],
            "enhancedDirectCode": direct_path_result["enhancedDirectCode"],
            "enhancedInterpretedCode": interpreted_path_result["enhancedInterpretedCode"],
            "bestImplementation": best_implementation
        }

        return ComplexResponse(
            code=final_response,
            steps=steps
        )
    except Exception as error:
        print("Error in complex query processing:", error)
        
        # Fallback to simple query handling if something fails in the complex path
        print("Falling back to simple query handling...")
        return await handle_simple_query(query)

async def call_openrouter(model: str, input: str):
    try:
        print(f"Calling OpenRouter with model: {model}")
        
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
                    "X-Title": "Code Generation Agent"
                },
            )
            
            response_data = response.json()
            if response_data and "choices" in response_data and response_data["choices"]:
                content = response_data["choices"][0]["message"]["content"]
                
                # Log model response with clear separation
                print(f"\n========== RESPONSE FROM {model} ==========")
                print(content[:500] + ('...' if len(content) > 500 else ''))
                print('==========================================\n')
                
                return content
            else:
                print("Unexpected response format:", response_data)
                return "Unexpected API response format"
    except Exception as error:
        error_message = getattr(error, "response", {}).get("data", str(error))
        print(f"Error calling OpenRouter with model {model}:", error_message)
        # Return error message instead of throwing
        return f"Failed to generate with {model}. Error: {str(error)}"

# For documentation and browser testing
@app.get("/")
async def root():
    return {
        "message": "Code Generation API",
        "usage": "Use GET /generate?query=your programming question",
        "example": "/generate?query=Write a Python function to reverse a string"
    }

# For running the app locally
if __name__ == "__main__":
    if not OPENROUTER_API_KEY:
        print("ERROR: OPENROUTER_API_KEY must be set in .env file or environment variables")
        print("Create a .env file with: OPENROUTER_API_KEY=your_key_here")
        exit(1)
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
