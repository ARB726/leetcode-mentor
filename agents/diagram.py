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
                - Use simple ASCII only, no special characters
                - Max 12 nodes
                - ONLY use these two shapes:
                  [text] for all steps, start, and end
                  {text} for decisions and conditions only
                - NEVER use () or ([]) or stadium or circle shapes
                - NEVER use special chars like colons in node text
                - Each node must have a unique ID like A, B, C
                - Example of valid syntax:
                  flowchart TD
                      A[Start] --> B[Initialize set]
                      B --> C[Loop through array]
                      C --> D{num in set?}
                      D -->|Yes| E[Return True]
                      D -->|No| F[Add to set]
                      F --> C
                      C --> G[Return False]
                      - NEVER use array indexing like nums[i] or arr[left] in node text
                      - Write as plain text like subtract left element instead
                      """
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

                CRITICAL RULES:
                - Output ONLY valid Mermaid code
                - Start with: flowchart TD
                - No markdown backticks
                - No explanations before or after
                - Keep node text short under 30 chars
                - Use simple ASCII only, no special characters
                - Max 12 nodes
                - ONLY use these two shapes:
                  [text] for all steps, start, and end
                  {text} for decisions and conditions only
                - NEVER use () or ([]) or stadium or circle shapes
                - NEVER use special chars like colons in node text
                - Each node must have a unique ID like A, B, C
                - Example of valid syntax:
                  flowchart TD
                      A[Identify pattern] --> B{Duplicate check?}
                      B -->|Yes| C[Use HashSet]
                      B -->|No| D[Consider sorting]
                      C --> E[O of n time]
                      D --> F[O of n log n time]
                      - NEVER use array indexing like nums[i] or arr[left] in node text
                      - Write as plain text like subtract left element instead
                      """
            },
            {
                "role": "user",
                "content": f"""Pattern lesson:\n{lesson}

Generate a Mermaid flowchart showing how this general pattern works and when to use it."""
            }
        ]
    )
    
    return response.choices[0].message.content.strip()