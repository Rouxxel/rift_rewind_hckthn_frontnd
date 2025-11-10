"""
#############################################################################
### AI Chat Assistant Endpoint
###
### @file ai_chat_assistant.py
### @Sebastian Russo
### @date: 2025
#############################################################################

This module provides an AI-powered chat assistant for League of Legends data analysis.
Users can ask questions about their game data, and the AI responds with personality
and knowledge about League of Legends.
"""

#Native imports
import os
import asyncio
from typing import Optional, Dict, Any

#Third-party imports
from fastapi import APIRouter, Body, Request, HTTPException
import google.generativeai as genai

#Other files imports
from src.utils.custom_logger import log_handler
from src.utils.limiter import limiter as SlowLimiter
from src.core_specs.configuration.config_loader import config_loader
from src.core_specs.data.data_loader import data_loader

"""VARIABLES-----------------------------------------------------------"""
#Get API key from environment
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise RuntimeError("GEMINI_API_KEY environment variable is not set.")

#Configure Gemini API
genai.configure(api_key=GEMINI_API_KEY)

#Default settings
DEFAULT_MODEL = config_loader["defaults"]["ai_model"]
DEFAULT_TIMEOUT = config_loader["defaults"]["ai_response_time.s"]

#Available models from general_data.json
AVAILABLE_MODELS = data_loader.get("available_gemini_models", [DEFAULT_MODEL])

#System prompt to give the AI personality and context
SYSTEM_PROMPT = """You are a League of Legends Assistant, a knowledgeable and friendly AI companion to coach players and answer questions.

Your personality:
- You're passionate about League of Legends and love discussing strategy, champions, and gameplay. Casual, encouraging, and sometimes playful that uses
 terminology naturally (e.g., "inting", "fed", "gank", "peel", "kiting")

Your role:
- Answer questions about player stats, match history, and champion data
- Provide insights and analysis based on the data users share
- Offer strategic advice and tips for improvement
- Explain game mechanics and meta trends
- Keep responses concise
"""

"""API ROUTER-----------------------------------------------------------"""
router = APIRouter(
    prefix=config_loader['endpoints']['ai_model_call_endpoint']['endpoint_prefix'],
    tags=[config_loader['endpoints']['ai_model_call_endpoint']['endpoint_tag']],
)

"""ENDPOINT-----------------------------------------------------------"""
@router.post(config_loader['endpoints']['ai_model_call_endpoint']['endpoint_route'])
@SlowLimiter.limit(
    f"{config_loader['endpoints']['ai_model_call_endpoint']['request_limit']}/"
    f"{config_loader['endpoints']['ai_model_call_endpoint']['unit_of_time_for_limit']}"
)
async def generate_ai_response(
    request: Request,
    prompt: str = Body(..., description="User's question or message"),
    context_data: Optional[Dict[str, Any]] = Body(None, description="Optional game data context (match history, stats, etc.)"),
    conversation_history: Optional[list] = Body(None, description="Previous messages in the conversation"),
    ai_model: Optional[str] = Body(DEFAULT_MODEL, description="AI model to use"),
    timeout: Optional[float] = Body(DEFAULT_TIMEOUT, description="Response timeout in seconds"),
) -> Dict[str, Any]:
    """
    Generate an AI response for League of Legends data analysis and questions.

    This endpoint provides an intelligent chat assistant that can answer questions about
    League of Legends gameplay, analyze player data, and provide strategic insights.

    Parameters:
    - prompt (str): The user's current question or message
    - context_data (Optional[Dict]): Game data context (only needed on first message or when data changes)
    - conversation_history (Optional[list]): Previous messages [{"role": "user", "content": "..."}, {"role": "assistant", "content": "..."}]
    - ai_model (Optional[str]): Gemini model to use (defaults to gemini-2.0-flash)
    - timeout (Optional[float]): Maximum response time in seconds (defaults to 10.0)

    Returns:
    - dict: Contains 'ai_response' with the assistant's answer and 'model_used'

    Example first message:
    ```json
    {
        "prompt": "How can I improve my KDA on Jinx?",
        "context_data": {
            "champion_mastery": {"Jinx": {"level": 7, "points": 150000}},
            "recent_matches": [...]
        }
    }
    ```

    Example follow-up message:
    ```json
    {
        "prompt": "What about my positioning?",
        "conversation_history": [
            {"role": "user", "content": "How can I improve my KDA on Jinx?"},
            {"role": "assistant", "content": "Great question! With 150k mastery..."}
        ]
    }
    ```
    """
    try:
        #Validate and select model
        model_name = ai_model if ai_model in AVAILABLE_MODELS else DEFAULT_MODEL
        log_handler.debug(f"Using AI model: {model_name}")

        #Build the full prompt with context
        full_prompt = SYSTEM_PROMPT + "\n\n"
        
        #Add game data context (only if provided - typically on first message)
        if context_data:
            full_prompt += "User's Game Data Context:\n"
            full_prompt += f"```json\n{context_data}\n```\n\n"
        
        #Add conversation history if this is a follow-up
        if conversation_history:
            full_prompt += "Previous Conversation:\n"
            for msg in conversation_history:
                role = msg.get("role", "user")
                content = msg.get("content", "")
                if role == "user":
                    full_prompt += f"User: {content}\n"
                elif role == "assistant":
                    full_prompt += f"Assistant: {content}\n"
            full_prompt += "\n"
        
        #Add current user question
        full_prompt += f"User: {prompt}\nAssistant:"

        #Initialize the model
        model = genai.GenerativeModel(model_name=model_name)

        #Generate response asynchronously with timeout
        loop = asyncio.get_running_loop()
        response = await asyncio.wait_for(
            loop.run_in_executor(None, lambda: model.generate_content(full_prompt)),
            timeout=timeout,
        )

        log_handler.info(f"AI response generated successfully for prompt: '{prompt[:50]}...'")
        
        return {
            "ai_response": response.text,
            "model_used": model_name
        }

    except asyncio.TimeoutError:
        log_handler.warning(f"AI request timed out after {timeout} seconds")
        raise HTTPException(
            status_code=504,
            detail=f"AI response took longer than {timeout} seconds. Try again or increase timeout."
        )
    
    except Exception as e:
        log_handler.error(f"AI generation failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate AI response: {str(e)}"
        )
