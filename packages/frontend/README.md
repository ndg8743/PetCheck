# PetCheck Frontend

React 18 Progressive Web App (PWA) for the PetCheck FDA Animal Drug Safety Explorer.

## Features

- React 18 with TypeScript
- Vite for fast builds and HMR
- TanStack Query for data fetching and caching
- React Router for navigation
- Tailwind CSS for styling
- PWA support with offline capabilities
- Google OAuth authentication

## Tech Stack

- **Framework**: React 18
- **Build Tool**: Vite
- **Language**: TypeScript
- **Data Fetching**: TanStack Query (React Query)
- **Routing**: React Router v6
- **Styling**: Tailwind CSS
- **PWA**: Vite PWA Plugin with Workbox
- **HTTP Client**: Axios

## Getting Started

### Prerequisites

- Node.js 18+ and pnpm
- Backend API running on http://localhost:3001

### Installation

```bash
# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env

# Update .env with your configuration
```

### Development

```bash
# Start development server
pnpm dev

# The app will be available at http://localhost:3000
```

### Building

```bash
# Type check
pnpm type-check

# Build for production
pnpm build

# Preview production build
pnpm preview
```

### Linting

```bash
pnpm lint
```

## Project Structure

```
src/
├── contexts/          # React contexts (Auth, etc.)
├── hooks/            # Custom React hooks
├── lib/              # Utilities and configurations
│   ├── api.ts        # Axios API client
│   └── queryClient.ts # TanStack Query client
├── types/            # TypeScript type definitions
├── App.tsx           # Main app component with routing
├── main.tsx          # App entry point
└── index.css         # Global styles and Tailwind imports
```

## Environment Variables

- `VITE_API_URL` - Backend API URL (default: http://localhost:3001/api)
- `VITE_GOOGLE_CLIENT_ID` - Google OAuth client ID

## PWA Features

- Offline support with service worker
- Installable on mobile and desktop
- Caching strategies for API responses
- Auto-update when new version is deployed

## API Integration

The app uses TanStack Query hooks for all API calls:

- `useDrugs`, `useDrug` - Drug information
- `useAdverseEvents`, `useAdverseEventSummary` - Adverse event data
- `useRecalls`, `useDrugRecalls` - Recall information
- `useInteractionCheck` - Drug interaction checking
- `usePets`, `usePet`, `usePetSafety` - Pet management
- `useVetSearch` - Veterinarian search

All hooks are defined in `src/hooks/useApi.ts`.

## Authentication

Authentication is handled via the `AuthContext`:

```tsx
import { useAuth } from './contexts/AuthContext';

function MyComponent() {
  const { user, login, logout, isAuthenticated } = useAuth();
  // ...
}
```

## Color Scheme

The app uses a medical/veterinary color scheme:

- **Primary (Cyan)**: Main brand color for primary actions
- **Secondary (Green)**: Success states and positive actions
- **Accent (Red)**: Warnings, alerts, and critical information
- **Info (Blue)**: Informational content

## License

MIT
