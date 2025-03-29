import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

// Define the models to use for each step with appropriate OpenRouter model IDs
const MODELS = {
  classifier: "mistralai/mistral-7b-instruct:free",   // For classifying query complexity
  interpreter: "google/gemini-2.0-flash-thinking-exp:free", // For understanding complex queries
  generator: "qwen/qwen2.5-vl-32b-instruct:free",     // For code generation  
  instructTuned: "mistralai/mistral-7b-instruct:free", // For customization and enhancement
  reviewer: "deepseek/deepseek-r1:free",              // For final review
};

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();

    if (!query) {
      return NextResponse.json(
        { error: "Query is required" },
        { status: 400 }
      );
    }

    console.log("Processing query:", query);

    // STEP 1: Query Classification - Determine complexity
    console.log("Classifying query complexity...");
    const complexityAnalysis = await callOpenrouter(
      MODELS.classifier,
      `Analyze this coding request and classify it as "simple" or "complex" or "ambiguous".
      - Simple: Basic requests like "Write a Python function to reverse a string."
      - Complex: Requests involving customization, optimization, or multiple features.
      - Ambiguous: Unclear requests lacking specifics.
      Respond with ONLY the word "simple", "complex", or "ambiguous".
      Query: "${query}"`
    );

    const queryType = complexityAnalysis.trim().toLowerCase().replace(/[^a-z]/g, '');
    console.log("Query classified as:", queryType);

    // Process based on complexity
    if (queryType.includes("ambiguous")) {
      return handleAmbiguousQuery(query);
    } else if (queryType.includes("simple")) {
      return handleSimpleQuery(query);
    } else {
      return handleComplexQuery(query);
    }
  } catch (error) {
    console.error("Error in code generation:", error);
    return NextResponse.json(
      { error: "Failed to generate code", details: String(error) },
      { status: 500 }
    );
  }
}

async function handleAmbiguousQuery(query: string) {
  console.log("Processing ambiguous query...");
  const feedback = await callOpenrouter(
    MODELS.interpreter,
    `You are a coding assistant. This query is ambiguous or lacks specifics: "${query}". 
    Please provide helpful feedback on what details are needed to generate the code.
    Be specific about what information is missing (e.g., programming language, input/output format, etc.).`
  );

  console.log("Ambiguous query feedback:", feedback);

  return NextResponse.json({ 
    code: ` ${feedback}\n\nPlease provide more details so I can generate the appropriate code for you.`,
    feedback,
    ambiguous: true
  });
}

async function handleSimpleQuery(query: string) {
  console.log("Processing simple query with single model...");
  
  const code = await callOpenrouter(
    MODELS.instructTuned,
    `You are a programming assistant. Generate clean, well-commented, production-ready code for this request: "${query}".
    Include proper error handling and follow best practices for the chosen programming language.
    Focus on writing efficient, readable code that directly addresses the request.`
  );
  
  console.log("Simple query result:", code.substring(0, 100) + "...");
  
  return NextResponse.json({ 
    code,
    steps: { directCode: code }
  });
}

async function handleComplexQuery(query: string) {
  console.log("Processing complex query with full pipeline...");
  
  // STEP 1: Get detailed interpretation
  console.log("Getting detailed interpretation...");
  const interpretation = await callOpenrouter(
    MODELS.interpreter,
    `You are a programming assistant. Understand this coding request and convert it into a clear, detailed specification: "${query}"`
  );
  
  console.log("Interpretation complete:", interpretation.substring(0, 150) + "...");
  
  // Check if interpretation reveals ambiguity
  if (interpretation.toLowerCase().includes("unclear") || 
      interpretation.toLowerCase().includes("ambiguous") || 
      interpretation.toLowerCase().includes("need more information")) {
    console.log("Interpretation indicates ambiguity, redirecting to ambiguous handler");
    return handleAmbiguousQuery(query);
  }

  // STEP 2-4: Run the remaining steps in parallel paths for efficiency
  console.log("Running parallel processing paths...");
  try {
    const [directCodePath, interpretedCodePath] = await Promise.all([
      // PATH 1: Direct code generation with enhancement
      (async () => {
        console.log("PATH 1: Starting direct code generation");
        // Generate code directly from query
        const directCode = await callOpenrouter(
          MODELS.generator,
          `You are a code generation expert. Generate clean, well-commented, production-ready code for: "${query}".
          Include proper error handling and follow best practices.`
        );
        
        console.log("PATH 1: Starting code enhancement");
        // Enhance direct code
        const enhancedDirectCode = await callOpenrouter(
          MODELS.instructTuned,
          `Improve this code for better performance and readability. Apply any specific customizations 
          mentioned in this request: "${query}"\n\nCode:\n${directCode}`
        );
        
        console.log("PATH 1: Complete");
        return { directCode, enhancedDirectCode };
      })(),
      
      // PATH 2: Interpreted code generation with enhancement
      (async () => {
        console.log("PATH 2: Starting interpreted code generation");
        // Generate code from interpretation
        const interpretedCode = await callOpenrouter(
          MODELS.generator,
          `Generate clean, well-commented code based on this specification: "${interpretation}"`
        );
        
        console.log("PATH 2: Starting code enhancement");
        // Enhance interpreted code
        const enhancedInterpretedCode = await callOpenrouter(
          MODELS.instructTuned,
          `Improve this code for better performance, readability, and error handling:\n\n${interpretedCode}`
        );
        
        console.log("PATH 2: Complete");
        return { interpretedCode, enhancedInterpretedCode };
      })()
    ]);
    
    // STEP 5: Select the best implementation
    console.log("Selecting best implementation...");
    const selectionPrompt = 
      `You are a code selection expert. Choose the better implementation that is more correct, efficient, and readable.
      IMPLEMENTATION 1:\n${directCodePath.enhancedDirectCode}\n\n
      IMPLEMENTATION 2:\n${interpretedCodePath.enhancedInterpretedCode}\n\n
      Respond with ONLY the complete selected implementation, no explanation needed.`;
    
    const bestImplementation = await callOpenrouter(MODELS.reviewer, selectionPrompt);
    console.log("Best implementation selected.");
    
    // STEP 6: Final review and polishing
    console.log("Performing final code review...");
    const finalResponse = await callOpenrouter(
      MODELS.reviewer,
      `Review this code and ensure it meets industry best practices, security standards, and handles errors properly.
      Add thorough comments explaining the key components and any optimizations you've made.
      Provide the final, improved version:\n\n${bestImplementation}`
    );
    
    console.log("Final response generated. Process complete.");

    return NextResponse.json({ 
      code: finalResponse,
      steps: {
        interpretation,
        directCode: directCodePath.directCode,
        interpretedCode: interpretedCodePath.interpretedCode,
        enhancedDirectCode: directCodePath.enhancedDirectCode,
        enhancedInterpretedCode: interpretedCodePath.enhancedInterpretedCode,
        bestImplementation
      }
    });
  } catch (error) {
    console.error("Error in complex query processing:", error);
    
    // Fallback to simple query handling if something fails in the complex path
    console.log("Falling back to simple query handling...");
    return handleSimpleQuery(query);
  }
}

async function callOpenrouter(model: string, input: string) {
  try {
    console.log(`Calling OpenRouter with model: ${model}`);
    
    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model,
        messages: [{ role: "user", content: input }],
        temperature: 0.5,
        max_tokens: 2048,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "HTTP-Referer": "https://conv-code-generation-agent.vercel.app", 
          "X-Title": "Code Generation Agent"
        },
      }
    );
    
    if (response.data && response.data.choices && response.data.choices[0]) {
      const content = response.data.choices[0].message.content;
      
      // Log model response with clear separation
      console.log(`\n========== RESPONSE FROM ${model} ==========`);
      console.log(content.substring(0, 500) + (content.length > 500 ? '...' : ''));
      console.log('==========================================\n');
      
      return content;
    } else {
      console.warn("Unexpected response format:", JSON.stringify(response.data));
      return "Unexpected API response format";
    }
  } catch (error: any) {
    console.error(`Error calling OpenRouter with model ${model}:`, error.response?.data || error.message);
    // Return error message instead of throwing
    return `Failed to generate with ${model}. Error: ${error.message}`;
  }
}
