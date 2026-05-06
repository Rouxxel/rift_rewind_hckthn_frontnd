# 💬 Conversation Flow Explained

## 🎯 Quick Answer to Your Question

**Yes, you provide prompt + context_data initially, then for follow-ups you provide prompt + conversation_history.**

Here's exactly how it works:

---

## 📊 Visual Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    FIRST MESSAGE                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Frontend sends:                                            │
│  {                                                          │
│    "prompt": "How can I improve my KDA on Jinx?",         │
│    "context_data": {                                       │
│      "champion_mastery": {...},                           │
│      "recent_matches": [...]                              │
│    }                                                       │
│  }                                                         │
│                                                             │
│  Backend returns:                                          │
│  {                                                         │
│    "ai_response": "Great question! With 150k mastery...", │
│    "model_used": "gemini-2.5-flash"                       │
│  }                                                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                            ↓
                   Frontend stores:
                   - User message
                   - AI response
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   FOLLOW-UP MESSAGE                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Frontend sends:                                            │
│  {                                                          │
│    "prompt": "What about my positioning?",                 │
│    "conversation_history": [                               │
│      {"role": "user", "content": "How can I improve..."},  │
│      {"role": "assistant", "content": "Great question..."} │
│    ]                                                        │
│  }                                                          │
│                                                             │
│  Backend returns:                                           │
│  {                                                          │
│    "ai_response": "Positioning is crucial for Jinx!...",   │
│    "model_used": "gemini-2.5-flash"                        │
│  }                                                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                            ↓
                   Frontend appends:
                   - New user message
                   - New AI response
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  ANOTHER FOLLOW-UP                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Frontend sends:                                            │
│  {                                                          │
│    "prompt": "Any tips for teamfights?",                   │
│    "conversation_history": [                               │
│      {"role": "user", "content": "How can I improve..."},  │
│      {"role": "assistant", "content": "Great question..."}, │
│      {"role": "user", "content": "What about positioning?"},│
│      {"role": "assistant", "content": "Positioning is..."}  │
│    ]                                                        │
│  }                                                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 Three Strategies

### **Strategy 1: Context Once (Recommended for Most Cases)**

```javascript
// First message
{
  "prompt": "How can I improve?",
  "context_data": gameData  // ✅ Include game data
}

// Follow-up messages
{
  "prompt": "What about positioning?",
  "conversation_history": messages  // ✅ Include chat history
  // ❌ No context_data
}
```

**When to use:** Normal conversations where game data doesn't change

---

### **Strategy 2: Always Include Context (Best for Accuracy)**

```javascript
// Every message
{
  "prompt": "Your question",
  "context_data": gameData,  // ✅ Always include
  "conversation_history": messages  // ✅ Also include history
}
```

**When to use:** When you want maximum accuracy and don't mind larger requests

---

### **Strategy 3: Smart Updates (Most Efficient)**

```javascript
// First message
{
  "prompt": "Analyze my matches",
  "context_data": gameData
}

// Follow-ups (no new data)
{
  "prompt": "Tell me more",
  "conversation_history": messages
}

// After fetching new match data
{
  "prompt": "I just played another game",
  "context_data": updatedGameData,  // ✅ New data!
  "conversation_history": messages
}
```

**When to use:** Production apps where you track data changes

---

## 💻 Simple Frontend Example

```javascript
// State
const [messages, setMessages] = useState([]);
const [gameData, setGameData] = useState(null);

// Load game data once
useEffect(() => {
  const data = JSON.parse(localStorage.getItem('playerData'));
  setGameData(data);
}, []);

// Send message function
const sendMessage = async (userInput) => {
  // Add user message to state
  const newMessages = [...messages, { role: 'user', content: userInput }];
  setMessages(newMessages);

  // Build request
  const request = {
    prompt: userInput,
  };

  // First message? Include context
  if (messages.length === 0 && gameData) {
    request.context_data = gameData;
  }
  
  // Follow-up? Include history
  if (messages.length > 0) {
    request.conversation_history = messages;
  }

  // Call API
  const response = await fetch('/ai/generate_ai_response', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  });

  const data = await response.json();

  // Add AI response to state
  setMessages([...newMessages, { 
    role: 'assistant', 
    content: data.ai_response 
  }]);
};
```

---

## 🎯 Key Points

1. **First Message:**
   - ✅ Send `prompt` + `context_data`
   - ❌ No `conversation_history` (it's empty)

2. **Follow-up Messages:**
   - ✅ Send `prompt` + `conversation_history`
   - ⚠️ Optional: `context_data` (only if data changed)

3. **New Conversation:**
   - Reset `messages` array
   - Start fresh with `prompt` + `context_data`

4. **Context Data:**
   - Contains game stats (matches, mastery, rank, etc.)
   - Loaded from localStorage or API
   - Only changes when new data is fetched

5. **Conversation History:**
   - Array of previous messages
   - Format: `[{role: "user", content: "..."}, {role: "assistant", content: "..."}]`
   - Grows with each exchange

---

## ❓ FAQ

### Q: Do I need to send context_data with every message?
**A:** No! Only on the first message or when data changes.

### Q: What if the conversation gets very long?
**A:** Limit history to last 10-20 messages:
```javascript
const recentHistory = messages.slice(-20);
```

### Q: Can I update context_data mid-conversation?
**A:** Yes! Just include it in any message:
```javascript
{
  "prompt": "I just played another game",
  "context_data": newGameData,
  "conversation_history": messages
}
```

### Q: What happens if I don't send conversation_history?
**A:** The AI treats it as a new conversation and won't remember previous messages.

### Q: Should I include the current user message in conversation_history?
**A:** No! Only include previous messages. The current message goes in `prompt`.

---

## 🚀 Quick Implementation Checklist

- [ ] Load game data from localStorage
- [ ] Create messages state array
- [ ] First message: send prompt + context_data
- [ ] Store AI response in messages
- [ ] Follow-ups: send prompt + conversation_history
- [ ] Add "New Chat" button to reset messages
- [ ] Test the flow!

---

## 📝 Complete Example Request Sequence

### Request 1
```json
{
  "prompt": "How can I improve my KDA on Jinx?",
  "context_data": {
    "champion_mastery": {"Jinx": {"level": 7, "points": 150000}},
    "recent_matches": [{"champion": "Jinx", "kda": "8/5/12"}]
  }
}
```

### Request 2
```json
{
  "prompt": "What about my positioning?",
  "conversation_history": [
    {"role": "user", "content": "How can I improve my KDA on Jinx?"},
    {"role": "assistant", "content": "Great question! With 150k mastery on Jinx..."}
  ]
}
```

### Request 3
```json
{
  "prompt": "Any tips for teamfights?",
  "conversation_history": [
    {"role": "user", "content": "How can I improve my KDA on Jinx?"},
    {"role": "assistant", "content": "Great question! With 150k mastery on Jinx..."},
    {"role": "user", "content": "What about my positioning?"},
    {"role": "assistant", "content": "Positioning is crucial for Jinx! Since you're immobile..."}
  ]
}
```

---

**That's it!** Check `FRONTEND_CHAT_INTEGRATION.md` for complete React/Vue examples.
