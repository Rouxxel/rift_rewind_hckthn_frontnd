# AI Chat Assistant for Rift Rewind

## Overview

The AI Chat Assistant provides an intelligent, League of Legends-savvy companion that can answer questions about player data, provide strategic insights, and analyze gameplay patterns.

## Features

- **Personality**: Friendly, knowledgeable summoner who speaks the language of League
- **Context-Aware**: Can analyze player data (match history, champion mastery, ranked stats)
- **Strategic Insights**: Provides tips, analysis, and recommendations
- **Flexible**: Supports multiple Gemini AI models

## Setup

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Configure API Key

Get your Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey) and add it to `.env`:

```env
GEMINI_API_KEY=your-actual-gemini-api-key-here
```

### 3. Verify Configuration

The endpoint uses these config values from `config_file.json`:
- `defaults.ai_model`: Default model (gemini-2.0-flash)
- `defaults.ai_response_time.s`: Timeout in seconds (10.0)
- `endpoints.ai_model_call_endpoint`: Endpoint configuration

Available models are loaded from `general_data.json` under `available_gemini_models`.

## API Usage

### Endpoint

```
POST /ai/generate_ai_response
```

### Request Body

```json
{
  "prompt": "How can I improve my KDA on Jinx?",
  "context_data": {
    "champion_mastery": {
      "Jinx": {
        "level": 7,
        "points": 150000
      }
    },
    "recent_matches": [
      {
        "champion": "Jinx",
        "kills": 8,
        "deaths": 5,
        "assists": 12,
        "win": true
      }
    ]
  },
  "ai_model": "gemini-2.0-flash",
  "timeout": 10.0
}
```

### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `prompt` | string | Yes | - | User's question or message |
| `context_data` | object | No | null | Game data context (match history, stats, etc.) |
| `ai_model` | string | No | gemini-2.0-flash | Gemini model to use |
| `timeout` | float | No | 10.0 | Response timeout in seconds |

### Response

```json
{
  "ai_response": "Great question! With 150k mastery points on Jinx, you're clearly experienced. Looking at your recent match (8/5/12), your KDA is solid at 4.0. Here are some tips to push it even higher:\n\n1. **Positioning**: As Jinx, you're immobile without your passive. Stay behind your frontline and use your range advantage.\n2. **Rocket Form**: Toggle to rockets in teamfights for AOE damage and safer positioning.\n3. **Peel Awareness**: Your E (Flame Chompers) is crucial for self-peel. Save it for assassins diving you.\n4. **Objective Control**: Your passive makes you a cleanup queen. Position for resets during objective fights.\n\nKeep it up, summoner! You're doing great.",
  "model_used": "gemini-2.0-flash"
}
```

## Example Use Cases

### 1. Simple Question

```bash
curl -X POST "http://localhost:8000/ai/generate_ai_response" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "What are the best ADC champions in the current meta?"
  }'
```

### 2. Performance Analysis

```bash
curl -X POST "http://localhost:8000/ai/generate_ai_response" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Analyze my recent performance",
    "context_data": {
      "summoner_name": "PlayerName#NA1",
      "ranked_stats": {
        "tier": "Gold",
        "rank": "II",
        "wins": 45,
        "losses": 42
      },
      "recent_matches": [
        {"champion": "Jinx", "kda": "8/5/12", "win": true},
        {"champion": "Caitlyn", "kda": "3/7/4", "win": false},
        {"champion": "Jinx", "kda": "12/2/15", "win": true}
      ]
    }
  }'
```

### 3. Champion Mastery Insights

```bash
curl -X POST "http://localhost:8000/ai/generate_ai_response" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Should I focus on mastering one champion or play multiple?",
    "context_data": {
      "champion_mastery": {
        "Jinx": {"level": 7, "points": 150000},
        "Caitlyn": {"level": 5, "points": 45000},
        "Ashe": {"level": 4, "points": 28000}
      }
    }
  }'
```

## Frontend Integration

### React Example

```javascript
const askAI = async (question, gameData) => {
  try {
    const response = await fetch('http://localhost:8000/ai/generate_ai_response', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: question,
        context_data: gameData, // Data from localStorage
        ai_model: 'gemini-2.0-flash',
        timeout: 15.0
      })
    });

    const data = await response.json();
    return data.ai_response;
  } catch (error) {
    console.error('AI request failed:', error);
    throw error;
  }
};

// Usage
const gameData = JSON.parse(localStorage.getItem('playerData'));
const answer = await askAI('How can I improve my gameplay?', gameData);
```

### Vue Example

```javascript
export default {
  methods: {
    async askAI(question) {
      const gameData = JSON.parse(localStorage.getItem('playerData'));
      
      const response = await fetch('http://localhost:8000/ai/generate_ai_response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: question,
          context_data: gameData
        })
      });

      const data = await response.json();
      this.aiResponse = data.ai_response;
    }
  }
}
```

## Rate Limiting

- **Limit**: 20 requests per minute (configurable in `config_file.json`)
- **Response**: HTTP 429 if limit exceeded

## Error Handling

| Status Code | Description |
|-------------|-------------|
| 200 | Success |
| 429 | Rate limit exceeded |
| 500 | Internal server error (AI generation failed) |
| 504 | Gateway timeout (AI took too long) |

## Tips for Best Results

1. **Provide Context**: Include relevant game data for personalized insights
2. **Be Specific**: Ask clear, focused questions
3. **Use Game Data**: The AI works best with actual player statistics
4. **Reasonable Timeouts**: Complex analysis may need 15-20 seconds

## Personality Examples

The AI assistant has a League-savvy personality:

- "Looking at your 150k mastery on Jinx, you're clearly a Get Excited! enthusiast!"
- "That 8/5/12 KDA is solid, but let's push it even higher"
- "Your positioning in teamfights is key - you're immobile without that passive reset"
- "Nice win streak! Keep that momentum going, summoner"

## Troubleshooting

### API Key Issues

```
RuntimeError: GEMINI_API_KEY environment variable is not set.
```

**Solution**: Add your Gemini API key to `.env` file

### Timeout Errors

```
504 Gateway Timeout
```

**Solution**: Increase the `timeout` parameter in your request

### Model Not Available

If a model isn't available, the endpoint automatically falls back to the default model (`gemini-2.0-flash`).

## Future Enhancements

- [ ] Conversation history/memory
- [ ] Multi-turn chat sessions
- [ ] Voice response support
- [ ] Image analysis (champion builds, rune pages)
- [ ] Proactive insights and notifications
