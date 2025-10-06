# Power Flow Game Frontend

A React TypeScript frontend for the Power Flow Game that provides an interactive visualization of power grid systems with buses, transmission lines, and assets.

## Features

- **Interactive Grid Visualization**: SVG-based rendering of power grid components
- **Real-time Hover Information**: Detailed information panels for buses, transmission lines, and assets
- **Game State Management**: Track game phases, rounds, and player scores
- **Responsive Design**: Built with Tailwind CSS for modern UI
- **TypeScript Support**: Full type safety for better development experience

## Components

### Grid Visualization
- **Buses**: Colored rectangles representing electrical buses with voltage information
- **Transmission Lines**: Colored lines showing power flow between buses
- **Assets**: Colored circles representing generators (G) and loads (L)

### UI Components
- **Game Status**: Shows current phase (planning/execution/results) and round number
- **Game Controls**: Buttons to advance phases and reset the game
- **Player Table**: Displays player scores and asset counts
- **Info Panel**: Hover tooltips with detailed element information

## Getting Started

### Prerequisites
- Node.js 18.x or later
- npm or yarn package manager

### Installation

1. Clone the repository or navigate to the frontend directory
2. Install dependencies:
   ```bash
   npm install
   ```

### Development

Start the development server:
```bash
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000)

### Building for Production

Build the application:
```bash
npm run build
```

Start the production server:
```bash
npm run start
```

## Project Structure

```
src/
├── app/                    # Next.js app directory
│   ├── layout.tsx         # Root layout component
│   ├── page.tsx           # Main page component
│   └── globals.css        # Global styles
├── components/
│   ├── Game/              # Game-related components
│   │   ├── GridVisualization.tsx  # Main grid visualization
│   │   └── InfoPanel.tsx         # Element information display
│   └── UI/                # User interface components
│       ├── GameControls.tsx      # Game control buttons
│       ├── GameStatus.tsx        # Phase and round display
│       └── PlayerTable.tsx       # Player information table
├── types/
│   └── game.ts            # TypeScript type definitions
└── ...configuration files
```

## Data Structure

The application expects game state data in the following format:

```typescript
interface GameState {
  phase: 'planning' | 'execution' | 'results'
  round: number
  buses: Bus[]
  transmissionLines: TransmissionLine[]
  assets: Asset[]
  players: Player[]
}
```

## Customization

### Colors
Element colors are defined in the game state data and can be customized per element:
- Buses: Indicate voltage levels or status
- Lines: Show power flow capacity or loading
- Assets: Differentiate between generators and loads

### Styling
The application uses Tailwind CSS. Customize styles in:
- `src/app/globals.css` for global styles
- Component files for component-specific styles
- `tailwind.config.js` for theme customization

## Integration with Backend

Currently uses sample data. To integrate with your Python backend:

1. **REST API**: Replace sample data with API calls to your FastAPI/Flask server
2. **WebSocket**: Add real-time updates for live game state changes
3. **Authentication**: Add player authentication if needed

Example API integration:
```typescript
// services/api.ts
export async function fetchGameState(): Promise<GameState> {
  const response = await fetch('/api/game-state')
  return response.json()
}
```

## Development Notes

- The grid visualization uses SVG for precise positioning and scaling
- Hover interactions are handled at the component level
- Game state is managed with React useState (can be upgraded to Redux if needed)
- Components are fully typed with TypeScript interfaces

## Next Steps

1. **Backend Integration**: Connect to your Python game engine
2. **WebSocket Support**: Add real-time updates
3. **Enhanced Interactions**: Add click handlers for game actions
4. **Animation**: Add smooth transitions for state changes
5. **Testing**: Add unit tests for components
6. **Accessibility**: Enhance keyboard navigation and screen reader support

## Technologies Used

- **Next.js 15**: React framework with app directory
- **TypeScript**: Type-safe JavaScript
- **Tailwind CSS**: Utility-first CSS framework
- **React 18**: Modern React with hooks
- **ESLint**: Code linting and formatting