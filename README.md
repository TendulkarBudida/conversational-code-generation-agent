# Multi-LLM Code Generation Chatbot

A multi-user chat platform for enterprise-grade code generation, routing
requests across multiple LLMs via the OpenRouter API.

## What it does

Users can create multiple concurrent chat sessions and generate code by
prompting any of several supported LLMs through a single interface. Each
session is persisted independently, with authentication and session
storage handled through Firebase.

**Note:** this is a multi-model chat interface, not an autonomous agent —
each request is a single-turn generation call with no execution, memory
of previous turns, or self-correction. (A separate, genuinely agentic
version — with planning, sandboxed code execution, and a retry loop — is
in active development: see
[kyokai-agent-runtime](https://github.com/TendulkarBudida/kyokai-agent-runtime).)

## Features

- Multi-session chat management — multiple concurrent chats per user
- Routes requests across multiple LLMs via the OpenRouter API
- Firebase-based authentication and persistent chat storage
- Backend deployed on Hugging Face Spaces via FastAPI/Uvicorn

## Tech stack

**Frontend:** Next.js
**Backend:** Python, FastAPI, Uvicorn
**Auth & storage:** Firebase
**LLM access:** OpenRouter API
**Hosting:** Hugging Face Spaces

## Running locally

```bash
git clone https://github.com/TendulkarBudida/Multi-LLM-Code-Generation-Chatbot
cd Multi-LLM-Code-Generation-Chatbot
# install dependencies and configure environment variables (OpenRouter
# API key, Firebase config) per the setup instructions in this repo
```

## License

MIT
