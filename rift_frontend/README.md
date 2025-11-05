# Rift Rewind Frontend

A React-based coaching dashboard for League of Legends players, built for the Rift Rewind hackathon. This frontend interfaces with the Rift Rewind backend to provide personalized coaching insights and analytics.

## Features

- **User Authentication**: Riot ID-based login with PUUID retrieval
- **Coaching Dashboard**: Personalized insights and recommendations
- **Performance Analytics**: Match history and performance analysis
- **Game Assets Explorer**: Browse champions and items
- **Multi-Backend Support**: Works with local, AWS, and Render deployments

## Tech Stack

- **React 19** with TypeScript
- **Vite** for fast development and building
- **CSS3** with League of Legends inspired design
- **Local Storage** for user session management

## Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Running Rift Rewind backend

### Installation

1. **Clone and navigate to frontend**:
   ```bash
   cd rift_frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your backend URL
   ```

4. **Start development server**:
   ```bash
   npm run dev
   ```

5. **Open in browser**:
   ```
   http://localhost:5173
   ```

## Environment Configuration

Create a `.env` file with your backend configuration:

```env
# For local development
VITE_API_BASE_URL=http://localhost:8000
VITE_ENVIRONMENT=development

# For AWS deployment
# VITE_API_BASE_URL=https://your-aws-url.amazonaws.com

# For Render deployment  
# VITE_API_BASE_URL=https://your-app.onrender.com
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Project Structure

```
src/
├── components/          # React components
│   ├── UserAuth.tsx    # Login/authentication form
│   └── Dashboard.tsx   # Main coaching dashboard
├── config/             # Configuration files
│   └── api.ts         # API endpoints and settings
├── services/          # API service functions
│   └── api.ts        # Backend communication
├── types/            # TypeScript type definitions
│   └── user.ts      # User-related types
├── utils/           # Utility functions
│   └── storage.ts  # Browser storage management
├── App.tsx         # Main application component
├── App.css        # Application styles
├── main.tsx      # Application entry point
└── index.css    # Global styles
```

## User Flow

1. **Authentication**: User enters Riot ID (gameName + tagLine) and region
2. **PUUID Retrieval**: Frontend calls backend to get user's PUUID
3. **Data Storage**: User credentials and PUUID saved to localStorage
4. **Dashboard**: User sees personalized coaching interface
5. **Analytics**: Access to performance insights and recommendations

## API Integration

The frontend communicates with the Rift Rewind backend through:

- **User Authentication**: `/user/get_riot_puuid`
- **Summoner Info**: `/user/get_summoner_info`
- **Ranked Stats**: `/user/get_ranked_stats`
- **Performance Analytics**: `/analytics/get_player_performance`
- **Game Assets**: `/game_assets/get_lol_champions`, `/game_assets/get_lol_items`, `/game_assets/get_champion_abilities`

## Deployment

### Vercel (Recommended)

1. **Connect repository** to Vercel
2. **Set environment variables**:
   - `VITE_API_BASE_URL`: Your backend URL
   - `VITE_ENVIRONMENT`: `production`
3. **Deploy** automatically on push

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

### Other Platforms

The app can be deployed to any static hosting service:
- Netlify
- GitHub Pages
- AWS S3 + CloudFront
- Firebase Hosting

## Backend Compatibility

This frontend is designed to work with multiple backend deployments:

- **Local Development**: `http://localhost:8000`
- **AWS Lambda**: API Gateway URL
- **AWS App Runner**: App Runner URL  
- **Render**: Render app URL

Simply update the `VITE_API_BASE_URL` environment variable to switch backends.

## Styling

The application uses a League of Legends inspired color palette:

- **Gold**: `#c89b3c` (Primary accent)
- **Blue**: `#5bc0de` (Secondary accent)
- **Dark Blue**: `#0a1428` (Background)
- **Gray**: `#1e2328` (Cards/containers)
- **Cream**: `#f0e6d2` (Text)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is part of the Rift Rewind hackathon submission.

## Support

For issues and questions:
- Check the browser console for errors
- Verify backend connectivity
- Ensure environment variables are set correctly
- Review the [DEPLOYMENT.md](./DEPLOYMENT.md) guide