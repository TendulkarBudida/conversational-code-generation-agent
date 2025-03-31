# Conversational Code Generation Agent

A sophisticated backend API service that generates code based on natural language queries using a pipeline of AI models via OpenRouter.

## Features

- **Intelligent Query Processing**: Automatically classifies queries as simple, complex, or ambiguous
- **Multi-model Pipeline**: Leverages specialized AI models for different stages of code generation
- **Parallel Processing**: Employs concurrent execution paths for complex queries to improve results
- **Fallback Mechanisms**: Gracefully handles errors with alternative processing paths

## Tech Stack

- FastAPI
- Python 3.9+
- OpenRouter API (with multiple AI models)
- Docker

## Getting Started

### Prerequisites

- Python 3.9 or higher
- OpenRouter API key (get one from [OpenRouter](https://openrouter.ai/))

### Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd conversational-code-generation-agent/backend
   ```

2. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

3. Create a `.env` file with your OpenRouter API key:
   ```
   OPENROUTER_API_KEY=your_api_key_here
   ```

### Running Locally

```
python app.py
```

The API will be available at `http://localhost:8000`.

### Docker Deployment

Build and run the Docker container:

```
docker build -t code-generation-agent .
docker run -p 7860:7860 -e OPENROUTER_API_KEY=your_api_key_here code-generation-agent
```

## API Endpoints

### GET `/`

Returns basic information about the API.

### GET `/generate`

Generates code based on a natural language query.

#### Query Parameters

- `query` (required): The programming question or request

#### Example

```
GET /generate?query=Write a Python function to reverse a string
```

#### Response Format

For simple queries:
```json
{
  "code": "string",
  "steps": {
    "directCode": "string"
  }
}
```

For complex queries:
```json
{
  "code": "string",
  "steps": {
    "interpretation": "string",
    "directCode": "string",
    "interpretedCode": "string",
    "enhancedDirectCode": "string",
    "enhancedInterpretedCode": "string",
    "bestImplementation": "string"
  }
}
```

For ambiguous queries:
```json
{
  "code": "string",
  "feedback": "string",
  "ambiguous": true
}
```

## AI Model Pipeline

The system uses a pipeline of specialized AI models from OpenRouter:

1. **Classifier** (Mistral 7B): Determines query complexity
2. **Interpreter** (Gemini 2.0): Analyzes complex queries and creates specifications
3. **Generator** (Qwen 2.5): Generates the initial code
4. **InstructTuned** (Mistral 7B): Customizes and enhances code
5. **Reviewer** (DeepSeek R1): Reviews, compares and polishes the final code

## Environment Variables

- `OPENROUTER_API_KEY` (required): Your OpenRouter API key
- `BASE_URL` (optional): OpenRouter API base URL
- `APP_NAME` (optional): Application name for OpenRouter requests
- `HTTP_REFERER` (optional): HTTP referer for OpenRouter requests

## Logging

The system maintains logs of responses from each AI model in the `logs` directory:

- `classifier_responses.txt`
- `interpreter_responses.txt`
- `generator_direct_responses.txt`
- `generator_interpreted_responses.txt`
- `instructTuned_responses.txt`
- `instructTuned_enhance_direct_responses.txt`
- `instructTuned_enhance_interpreted_responses.txt`
- `reviewer_compare_responses.txt`
- `reviewer_polish_responses.txt`
