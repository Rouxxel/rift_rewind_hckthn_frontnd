# 🎮 Rift Rewind - League of Legends AI Coach

**Rift Rewind** is an intelligent League of Legends coaching platform that provides comprehensive performance analysis, match predictions, and AI-powered insights to help players improve their gameplay.

---

## ✨ Features

### 🎯 Performance Analysis
- **Champion Mastery Tracking**: View mastery levels, points, and chest status
- **Summoner Spells Analysis**: Detailed breakdown of spell usage and win rates
- **Rune Masteries**: Comprehensive analysis of keystone choices and performance
- **User-Configurable Filters**: Filter by champion and match count

### 📊 Match History
- **Detailed Match Information**: Complete match details with game mode and duration
- **Team Composition Analysis**: AI-powered analysis of team strengths and weaknesses
- **Match Timeline**: Frame-by-frame breakdown of kills, objectives, and events
- **Match Predictions**: Retroactive AI predictions for accuracy analysis
- **Smart Champion Name Resolution**: Automatic handling of special characters

### 🔮 Predictions & Analytics
- **Champion Winrates**: Real-time winrate data across different ranks
- **Match Outcome Predictions**: AI-powered predictions for custom team compositions
- **Team Builder**: Interactive tool to build 5v5 team compositions
- **Detailed Analysis**: Comprehensive breakdown of team strengths and win conditions

### 🎮 Game Assets Explorer
- **Champions Database**: Browse all League of Legends champions
- **Items Database**: Explore all items with stats and descriptions
- **Champion Details**: In-depth champion abilities, stats, and lore
- **Item Details**: Complete item information including build paths

### 🤖 AI Assistant
- **Context-Aware Chat**: Intelligent chatbot that understands your current page
- **Markdown Support**: Rich text formatting for better readability
- **Typewriter Effect**: Smooth character-by-character response animation
- **Page-Specific Guidance**: Automatically directs users to appropriate pages
- **Conversation Memory**: Maintains separate chat history per page
- **Comprehensive Logging**: Detailed console logs for debugging

---

## 🛠️ Tech Stack

### Frontend
- React 18 with TypeScript
- Vite for fast development
- React Markdown for AI responses
- CSS3 with custom styling
- LocalStorage for caching

### Backend
- FastAPI (Python)
- Google Gemini AI
- Riot Games API
- Custom caching system

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- Python 3.9+
- Riot Games API Key
- Google Gemini API Key

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd rift_frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start development server:
```bash
npm run dev
```

4. Build for production:
```bash
npm run build
```

### Backend Setup

1. Install Python dependencies:
```bash
pip install -r requirements.txt
```

2. Set environment variables:
```bash
export RIOT_API_KEY="your_riot_api_key"
export GEMINI_API_KEY="your_gemini_api_key"
```

3. Run the backend server:
```bash
python main.py
```

---

## 🤖 AI Assistant

The AI Assistant is a context-aware chatbot powered by Google Gemini that helps users navigate the application and understand their League of Legends data.

### Key Features
- Context-aware responses based on current page
- Markdown rendering with code blocks, lists, and formatting
- Typewriter effect (20ms per character)
- Smart routing to appropriate pages
- Conversation memory per page
- Comprehensive console logging

### Console Logging

All operations are logged with emoji prefixes:
- `💬 [AI Assistant]` - Chat window actions
- `🤖 [AI Assistant]` - Message sending
- `🔍 [AI Assistant]` - Context building
- `💾 [AI Assistant]` - Caching operations
- `✅ [AI Assistant]` - Success messages
- `❌ [AI Assistant]` - Error messages

---

## 🔌 API Endpoints

### User & Authentication
- `POST /user/get_riot_puuid` - Get user PUUID
- `POST /user/get_summoner_info` - Get summoner information
- `POST /user/get_ranked_stats` - Get ranked statistics

### Match Data
- `POST /match/get_match_ids` - Get match history
- `POST /match/get_match_details` - Get match details
- `POST /match/get_match_participants` - Get participants
- `POST /match/get_match_timeline` - Get timeline events

### Performance Analysis
- `POST /performance/get_player_performance` - Get performance stats
- `POST /performance/get_champion_mastery` - Get champion mastery
- `POST /performance/get_summoner_spells_analysis` - Get spell usage
- `POST /performance/get_rune_masteries` - Get rune statistics

### Predictions & Analysis
- `POST /predictions/get_match_outcome` - Predict match outcome
- `POST /predictions/get_champion_winrates` - Get winrate data
- `POST /analysis/get_team_composition` - Analyze team composition

### Game Assets
- `GET /assets/get_champions` - Get all champions
- `GET /assets/get_items` - Get all items
- `GET /assets/get_champion_details` - Get champion details
- `GET /assets/get_champion_abilities` - Get champion abilities

### AI Assistant
- `POST /ai/generate_ai_response` - Generate AI response

---

## 🎯 Key Features Explained

### Smart Champion Name Resolution

Automatically handles champion names with special characters:

**Example: "ChoGath"**
1. Attempt 1: `ChoGath` → 404
2. Attempt 2: `Cho Gath` → 404
3. Attempt 3: `Cho'Gath` → ✅ Success!

**Supported Formats:**
- Original name
- Space-separated (Cho Gath)
- Apostrophe-separated (Cho'Gath)
- No special characters (ChoGath)

### Caching Strategy

**LocalStorage Keys:**
- `rift_rewind_cache_champions` - Champions data (60 min)
- `rift_rewind_cache_items` - Items data (60 min)
- `rift_rewind_cache_match_details_*` - Match details (60 min)
- `rift_rewind_cache_player_performance_*` - Performance (15 min)
- `rift_rewind_cache_winrates_all_data` - Winrates (15 min)
- `rift_rewind_cache_current_match_prediction` - Latest prediction (30 min)
- `ai_chat_*` - AI conversation history per page

---

## 🐛 Debugging

### Console Logs

Filter in DevTools:
```javascript
// Show only AI Assistant logs
console.log filter: "[AI Assistant]"

// Show only Predictions logs
console.log filter: "[Predictions]"
```

### Common Issues

**Issue: "Champion not found" errors**
- Solution: Smart retry mechanism automatically tries multiple name formats

**Issue: AI Assistant not responding**
- Check: Backend is running and GEMINI_API_KEY is set
- Check: Browser console for error messages

**Issue: Data not loading**
- Check: RIOT_API_KEY is valid and not rate-limited
- Check: Network tab in DevTools for API errors

---

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Code Style
- TypeScript: Use strict typing
- React: Functional components with hooks
- CSS: Follow existing naming conventions
- Console Logs: Use emoji prefixes for consistency

---

## 📝 License

This project is licensed under the MIT License.

---

## 🙏 Acknowledgments

- Riot Games for the League of Legends API
- Google for the Gemini AI API
- Data Dragon for champion and item assets
- React and Vite communities

---

## 🎮 Happy Gaming and Good Luck on the Rift! 🎮

**Rift Rewind** - Your AI-Powered League of Legends Coach

---

*Built with ❤️ for the League of Legends community*
