# Mugen Code – Conversational Code Generation Agent

This project is a web‑based Conversational Code Generation Agent that lets you generate production‑ready code using natural language queries. It features a Next.js frontend with Firebase authentication and a FastAPI backend that leverages OpenRouter’s models for code generation.

## Getting Started

### 1. Clone the Repository
```bash
git clone <repository-url>
cd conversational-code-generation-agent
```

### 2. Frontend Setup
- Copy the provided `.env.local` file and set your keys (OpenRouter, Firebase, HuggingFace, etc.).
- Install dependencies:
```bash
npm install
```
- Run the development server:
```bash
npm run dev
```
Visit [http://localhost:3000](http://localhost:3000).

### 3. Backend Setup
- Navigate to the backend folder:
```bash
cd backend
```
- Create a `.env` file and add your OpenRouter API key.
- Install Python dependencies:
```bash
pip install -r requirements.txt
```
- Start the backend server:
```bash
python app.py
```

### 4. Features
- **Conversational Code Generation**: Enter queries like “Write a Python function…” and receive code.
- **Multi‑Model Pipeline**: Uses specialized models for interpretation, generation, enhancement, and review.
- **Firebase Authentication**: Log in using Google to interact with the agent.
- **Chat History**: Conversations are stored in Firestore.

## Learn More
- [Next.js Documentation](https://nextjs.org/docs)
- [Firebase Documentation](https://firebase.google.com/docs)
- [OpenRouter API](https://openrouter.ai)

...