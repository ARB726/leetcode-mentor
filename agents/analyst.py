from groq import Groq
import os

def analyze_problem(client: Groq, problem: str , language: str) -> str:
    print("\n🔍 Agent 1: Analyzing problem...")
    
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {
                "role": "system",
                "content": f"""You are an expert algorithm analyst. 
                Given a LeetCode problem, you will:
                1. Identify the problem type (array, tree, graph, DP, etc.)
                2. List all constraints and edge cases
                3. Identify what inputs and outputs are expected
                4. Suggest the best data structures to use
                Keep it concise and clear.
                Always use {language} for any code examples.
                """
            },
            {
                "role": "user",
                "content": f"Analyze this LeetCode problem:\n\n{problem}"
            }
        ]
    )
    
    return response.choices[0].message.content
