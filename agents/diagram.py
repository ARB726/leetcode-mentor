from groq import Groq

def generate_algorithm_diagram(client: Groq, problem: str, optimized: str, language: str = "Python") -> str:
    print("\n📊 Agent 5 - Algorithm Diagram: Visualizing solution flow...")
    
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {
                "role": "system",
                "content": """You are an expert at creating Mermaid diagrams to visualize algorithms.
                Generate a Mermaid flowchart showing how THIS SPECIFIC solution works step by step.

                CRITICAL RULES:
                - Output ONLY valid Mermaid code
                - Start with: flowchart TD
                - No markdown backticks
                - No explanations before or after
                - Keep node text short under 30 chars
                - Use simple ASCII only no special characters
                - Max 15 nodes
                - Use these shapes:
                  [text] for process steps
                  {text} for decisions
                  ([text]) for start and end"""
            },
            {
                "role": "user",
                "content": f"""Problem:\n{problem}
Optimized Solution:\n{optimized}

Generate a Mermaid flowchart for this specific algorithm."""
            }
        ]
    )
    
    return response.choices[0].message.content.strip()


def generate_pattern_diagram(client: Groq, lesson: str, language: str = "Python") -> str:
    print("\n🗺️ Agent 6 - Pattern Diagram: Visualizing the general pattern...")
    
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {
                "role": "system",
                "content": """You are an expert at creating Mermaid diagrams to teach algorithmic patterns.
                Generate a Mermaid flowchart showing how the GENERAL PATTERN works.
                This should be reusable and apply to ANY problem using this pattern.

                CRITICAL RULES:
                - Output ONLY valid Mermaid code
                - Start with: flowchart TD
                - No markdown backticks
                - No explanations before or after
                - Keep node text short under 30 chars
                - Use simple ASCII only no special characters
                - Max 15 nodes
                - Make it generic enough to apply to similar problems
                - Add a subgraph showing when to USE this pattern"""
            },
            {
                "role": "user",
                "content": f"""Pattern lesson:\n{lesson}

Generate a Mermaid flowchart showing how this general pattern works and when to use it."""
            }
        ]
    )
    
    return response.choices[0].message.content.strip()