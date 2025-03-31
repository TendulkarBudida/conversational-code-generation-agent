# Model Architecture for Conversational Code Generation Agent

This document outlines the architecture of the **Conversational Code Generation Agent**, updated to reflect the parallel paths implemented in the backend (`app.py`). The system uses multiple models in a modular and efficient pipeline to process user queries, ensuring high-quality code generation while optimizing for latency and accuracy.

---

## **Updated Workflow**

The system processes user queries using a hybrid approach, dynamically adjusting the pipeline based on the complexity of the query. For **simple queries**, a single model is used to handle the entire process. For **complex queries**, the system employs **two parallel paths** to generate and enhance code, followed by a final review step to select the best implementation. If a query is ambiguous, the system provides feedback to the user for clarification.

---

### **Pipeline Overview**

1. **Query Classification**:
   - **Model**: `mistralai/mistral-7b-instruct:free`
   - Classifies the query as `simple`, `complex`, or `ambiguous`.

2. **Ambiguous Query Handling**:
   - **Model**: `google/gemini-2.0-flash-thinking-exp:free`
   - Provides feedback to clarify ambiguous queries.

3. **Simple Query Handling**:
   - **Model**: `mistralai/mistral-7b-instruct:free`
   - Directly generates clean, production-ready code.

4. **Complex Query Handling**:
   - **Parallel Paths**:
     - **Direct Code Path**:
       - **Model**: `qwen/qwen2.5-vl-32b-instruct:free` → `mistralai/mistral-7b-instruct:free`
     - **Interpreted Code Path**:
       - **Model**: `google/gemini-2.0-flash-thinking-exp:free` → `qwen/qwen2.5-vl-32b-instruct:free` → `mistralai/mistral-7b-instruct:free`
   - **Final Step**: Select the best implementation.
     - **Model**: `deepseek/deepseek-r1:free`

5. **Final Review**:
   - **Model**: `deepseek/deepseek-r1:free`
   - Reviews the selected implementation for best practices and security.

6. **Fallback Mechanism**:
   - Falls back to the Simple Query Path if any step in the complex query pipeline fails.

---

### **Detailed Workflow**

#### **Step 1: Query Classification**
- **Input**: User query (e.g., "Write a Python function to reverse a string").
- **Model**: `mistralai/mistral-7b-instruct:free`
- **Process**:
  - Analyzes the query to determine its complexity.
  - Classifies the query as:
    - `simple`: Directly handled by the Simple Query Path.
    - `complex`: Processed using the Complex Query Path.
    - `ambiguous`: Feedback is provided to the user for clarification.
- **Output**: Classification result (`simple`, `complex`, or `ambiguous`).

---

#### **Step 2: Ambiguous Query Handling**
- **Input**: Ambiguous query (e.g., "Write a function to sort").
- **Model**: `google/gemini-2.0-flash-thinking-exp:free`
- **Process**:
  - Identifies missing or unclear details in the query.
  - Generates a clarification message for the user.
- **Output**: Feedback asking the user for more details (e.g., "Could you clarify the type of input for this function?").

---

#### **Step 3: Simple Query Path**
- **Input**: Simple query (e.g., "Write a Python function to reverse a string").
- **Model**: `mistralai/mistral-7b-instruct:free`
- **Process**:
  - Directly generates clean, well-commented, production-ready code.
- **Output**: The generated code.

---

#### **Step 4: Complex Query Path**
For complex queries, the system uses **two parallel paths**:

##### **Path 1: Direct Code Path**
1. **Generate Code**:
   - **Model**: `qwen/qwen2.5-vl-32b-instruct:free`
   - **Process**: Generates code directly from the query.
2. **Enhance Code**:
   - **Model**: `mistralai/mistral-7b-instruct:free`
   - **Process**: Enhances the generated code for performance, readability, and error handling.

##### **Path 2: Interpreted Code Path**
1. **Interpret Query**:
   - **Model**: `google/gemini-2.0-flash-thinking-exp:free`
   - **Process**: Converts the query into a detailed specification.
2. **Generate Code**:
   - **Model**: `qwen/qwen2.5-vl-32b-instruct:free`
   - **Process**: Generates code based on the interpreted specification.
3. **Enhance Code**:
   - **Model**: `mistralai/mistral-7b-instruct:free`
   - **Process**: Enhances the interpreted code for performance, readability, and error handling.

##### **Final Step: Select Best Implementation**
- **Model**: `deepseek/deepseek-r1:free`
- **Process**:
  - Compares the enhanced code from both paths.
  - Selects the better implementation based on quality metrics.

---

#### **Step 5: Final Review**
- **Input**: Selected implementation from the Complex Query Path.
- **Model**: `deepseek/deepseek-r1:free`
- **Process**:
  - Reviews the code for best practices, security, and error handling.
  - Ensures the code is production-ready.
- **Output**: Final, production-ready code.

---

#### **Step 6: Fallback Mechanism**
- **When Triggered**: If any step in the complex query pipeline fails.
- **Fallback Path**:
  - The system falls back to the Simple Query Path.
  - Ensures a response is always provided.
- **Output**: A response generated using the Simple Query Path.

---

### **Workflow Diagram**

Here’s the updated workflow diagram:

```
                  [User Query]
                       |
                       v
                [Classify Query]
     |-----------------|------------------|
     |                 |                  |
Simple Query     Complex Query       Ambiguous Query
     |                 |                  |
     v                 v                  v
[Simple Path]   [Parallel Paths]   [Provide Feedback]
     |                 |                  
     v                 |                  
[Generate Code]        |                  
                       |                  
                       |------------------|
                       |                  |
                       v                  v
         [Direct Code Path]     [Interpreted Code Path]
               |                          |
               v                          v
        [Generate Code]            [Interpret Query]
               |                          |
               v                          v
        [Enhance Code]             [Generate Code]
               |                          |
               |                          v
               v                    [Enhance Code]
               |------------|------------|
                            v
                [Select Best Implementation]
                            |
                            v
                    [Final Review]
                            |
                            v
                    [Return Final Code]
                            |
                            v
                    [Fallback if Needed]

```

---

### **Advantages of Parallel Paths**
1. **Improved Quality**: Each path provides a unique perspective, increasing the likelihood of generating high-quality code.
2. **Efficiency**: Running paths in parallel reduces overall latency compared to sequential processing.
3. **Robustness**: The fallback mechanism ensures a response is always provided, even if the complex pipeline fails.

---

### **Conclusion**
The architecture leverages parallel paths to balance efficiency and quality for complex queries. By dynamically adjusting the pipeline based on query complexity, the system ensures fast responses for simple queries while maintaining high-quality outputs for complex requests. This modular approach makes the system scalable, maintainable, and adaptable to future improvements.