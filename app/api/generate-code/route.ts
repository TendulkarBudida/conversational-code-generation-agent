import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();
    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    console.log("Processing query:", query);
    
    // Hit the local API endpoint with the user's prompt
    const response = await axios.get("http://127.0.0.1:8000/generate", {
      params: { query }
    });
    
    // Parse the output from the response, specifically the code parameter
    const output = typeof response.data.code === "string"
      ? response.data.code
      : JSON.stringify(response.data.code, null, 2);
    
    console.log("Generated code:", output.substring(0, 100) + "...");
    
    return NextResponse.json({ code: output });
  } catch (error: any) {
    console.error("Error in code generation:", error);
    return NextResponse.json({ error: "Failed to generate code", details: String(error) }, { status: 500 });
  }
}
