# PetCheck - FDA Animal Drug Safety Explorer

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

PetCheck is a comprehensive Progressive Web Application (PWA) that provides veterinarians, pet owners, and researchers with instant access to FDA animal drug safety data, adverse event reports, recall information, and drug interaction checking.

## Features

### For Pet Owners
- **Drug Search**: Search and explore FDA-approved animal drugs with detailed information
- **Adverse Event Reports**: View real-world safety data from the FDA's adverse event database
- **Recall Alerts**: Stay informed about animal drug and product recalls
- **Pet Profiles**: Manage multiple pet profiles with medication tracking
- **Interaction Checker**: Check for potential drug interactions for your pets
- **Veterinarian Finder**: Locate nearby veterinary clinics using Google Places API

### For Veterinarians
- **Clinical Decision Support**: Access comprehensive drug safety information at the point of care
- **Adverse Event Trends**: Analyze safety trends across different species and drugs
- **Drug Interaction Database**: Check multi-drug interactions for complex cases
- **Patient Management**: Track medications for multiple patients with interaction alerts

### For Researchers
- **Data Analytics**: Explore FDA adverse event data with filtering and visualization
- **Trend Analysis**: Analyze safety trends over time with interactive charts
- **Export Capabilities**: Download filtered datasets for further analysis
- **Green Book Integration**: Access the complete FDA Green Book animal drug database

### PWA Features
- **Offline Support**: Core functionality available without internet connection
- **Install to Home Screen**: Native app-like experience on mobile and desktop
- **Push Notifications**: Optional alerts for new recalls and safety updates
- **Responsive Design**: Optimized for mobile, tablet, and desktop devices
- **Fast Performance**: Service worker caching for instant page loads

## Tech Stack

### Frontend
- **React 18** - Modern UI library with hooks and concurrent features
- **TypeScript** - Type-safe development
- **Vite** - Lightning-fast build tool and dev server
- **TanStack Query** - Powerful async state management and caching
- **React Router** - Client-side routing
- **Tailwind CSS** - Utility-first CSS framework
- **Vite PWA Plugin** - Progressive Web App capabilities with Workbox

### Backend
- **Node.js** - JavaScript runtime
- **Express** - Fast, unopinionated web framework
- **TypeScript** - Type-safe API development
- **Redis** - In-memory data store for caching and sessions
- **JWT** - Secure authentication tokens
- **Helmet** - Security headers middleware
- **Winston** - Logging framework

### External APIs
- **OpenFDA API** - Adverse events, recalls, and Green Book data
- **Google OAuth 2.0** - User authentication
- **Google Places API** - Veterinarian location services

### DevOps & Tools
- **npm Workspaces** - Monorepo management
- **ESLint** - Code quality and consistency
- **Prettier** - Code formatting
- **Concurrently** - Run multiple dev servers

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** >= 18.0.0 ([Download](https://nodejs.org/))
- **npm** >= 9.0.0 (comes with Node.js)
- **Redis** >= 6.0 ([Installation Guide](https://redis.io/docs/getting-started/))

### API Keys Required

1. **Google OAuth Credentials** (for user authentication)
   - Create a project at [Google Cloud Console](https://console.cloud.google.com/)
   - Enable Google+ API
   - Create OAuth 2.0 credentials
   - Add authorized redirect URIs

2. **Google Places API Key** (for vet finder feature)
   - Enable Places API in Google Cloud Console
   - Create an API key with Places API enabled

3. **OpenFDA API Key** (optional but recommended)
   - Request at [openFDA](https://open.fda.gov/apis/authentication/)
   - Increases rate limits from 40 to 240 requests/minute

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/petcheck.git
cd petcheck
```

### 2. Install Dependencies

```bash
npm install
```

This will install dependencies for all packages in the monorepo.

### 3. Configure Environment Variables

Create a `.env` file in `packages/backend/`:

```bash
cp packages/backend/.env.example packages/backend/.env
```

Edit `packages/backend/.env` with your configuration (see [Environment Variables](#environment-variables) section).

### 4. Start Redis

```bash
# macOS with Homebrew
brew services start redis

# Linux
sudo systemctl start redis

# Windows (with Redis installed)
redis-server
```

### 5. Start Development Servers

```bash
npm run dev
```

This will start:
- Backend API server at `http://localhost:3001`
- Frontend dev server at `http://localhost:5173`

### 6. Build for Production

```bash
npm run build
```

Built files will be in:
- Backend: `packages/backend/dist/`
- Frontend: `packages/frontend/dist/`

## Project Structure

```
petcheck/
├── packages/
│   ├── backend/              # Express API server
│   │   ├── src/
│   │   │   ├── config/       # Configuration and env variables
│   │   │   ├── middleware/   # Express middleware (auth, rate limit, etc.)
│   │   │   ├── routes/       # API route handlers
│   │   │   ├── services/     # Business logic and external API clients
│   │   │   │   ├── auth/     # Google OAuth authentication
│   │   │   │   ├── openfda/  # FDA API integration
│   │   │   │   ├── interactions/  # Drug interaction engine
│   │   │   │   ├── pets/     # Pet profile management
│   │   │   │   └── places/   # Google Places integration
│   │   │   └── index.ts      # Server entry point
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── frontend/             # React PWA
│   │   ├── public/           # Static assets and PWA manifest
│   │   ├── src/
│   │   │   ├── components/   # Reusable UI components
│   │   │   │   ├── ui/       # Base UI components
│   │   │   │   ├── common/   # Shared business components
│   │   │   │   ├── layout/   # Layout components
│   │   │   │   └── charts/   # Data visualization
│   │   │   ├── pages/        # Route pages/views
│   │   │   ├── contexts/     # React contexts (Auth, etc.)
│   │   │   ├── hooks/        # Custom React hooks
│   │   │   ├── lib/          # Utilities and API client
│   │   │   ├── types/        # TypeScript type definitions
│   │   │   ├── App.tsx       # Root component
│   │   │   └── main.tsx      # Application entry point
│   │   ├── package.json
│   │   └── vite.config.ts    # Vite configuration
│   │
│   └── shared/               # Shared types and utilities
│       ├── src/
│       │   ├── types/        # Shared TypeScript types
│       │   └── utils/        # Shared utility functions
│       └── package.json
│
├── .eslintrc.js             # ESLint configuration
├── .prettierrc              # Prettier configuration
├── .gitignore               # Git ignore patterns
├── package.json             # Root package.json (workspaces)
└── README.md                # This file
```

## Environment Variables

Create a `.env` file in `packages/backend/` with the following variables:

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `PORT` | Backend server port | No | `3001` |
| `NODE_ENV` | Environment (`development` or `production`) | No | `development` |
| `REDIS_HOST` | Redis server hostname | No | `localhost` |
| `REDIS_PORT` | Redis server port | No | `6379` |
| `REDIS_PASSWORD` | Redis password (if required) | No | - |
| `REDIS_DB` | Redis database number | No | `0` |
| `JWT_SECRET` | Secret key for JWT signing | **Yes** | - |
| `JWT_EXPIRES_IN` | JWT expiration time | No | `7d` |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | **Yes** | - |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | **Yes** | - |
| `GOOGLE_PLACES_API_KEY` | Google Places API key | **Yes** | - |
| `OPENFDA_API_KEY` | OpenFDA API key | No | - |
| `FRONTEND_URL` | Frontend application URL | No | `http://localhost:5173` |
| `CORS_ORIGINS` | Comma-separated allowed CORS origins | No | `http://localhost:5173` |
| `LOG_LEVEL` | Logging level (`debug`, `info`, `warn`, `error`) | No | `info` |

## API Endpoints

### Authentication
- `POST /api/auth/google` - Google OAuth authentication
- `GET /api/auth/me` - Get current user profile
- `POST /api/auth/logout` - Logout user

### Drugs
- `GET /api/drugs/search?q={query}&species={species}` - Search animal drugs
- `GET /api/drugs/:nada` - Get drug details by NADA number
- `GET /api/drugs/green-book` - Get full Green Book database

### Adverse Events
- `GET /api/adverse-events/search?drug={name}&species={species}` - Search adverse events
- `GET /api/adverse-events/stats?drug={name}` - Get event statistics
- `GET /api/adverse-events/trends?drug={name}&timeframe={period}` - Get trend data

### Recalls
- `GET /api/recalls/search?q={query}&species={species}` - Search recalls
- `GET /api/recalls/recent?limit={n}` - Get recent recalls
- `GET /api/recalls/:id` - Get recall details

### Interactions
- `POST /api/interactions/check` - Check drug interactions
  - Body: `{ drugs: string[], species?: string }`

### Pets
- `GET /api/pets` - Get user's pets (auth required)
- `POST /api/pets` - Create pet profile (auth required)
- `GET /api/pets/:id` - Get pet details (auth required)
- `PUT /api/pets/:id` - Update pet profile (auth required)
- `DELETE /api/pets/:id` - Delete pet profile (auth required)

### Veterinarians
- `GET /api/vets/search?lat={lat}&lng={lng}&radius={meters}` - Find nearby vets

### Health
- `GET /api/health` - API health check
- `GET /api/health/ready` - Readiness probe
- `GET /api/health/live` - Liveness probe

## Security Considerations

### Implemented Security Measures
- **Helmet.js** - Sets secure HTTP headers
- **CORS** - Configured cross-origin resource sharing
- **Rate Limiting** - API rate limiting to prevent abuse
- **JWT Authentication** - Secure token-based authentication
- **Input Validation** - Express-validator for request validation
- **Redis Sessions** - Secure session management
- **HTTPS Enforcement** - Recommended for production
- **Content Security Policy** - Prevents XSS attacks
- **Compression** - Gzip compression for responses

### Best Practices
1. Never commit `.env` files to version control
2. Use strong, unique `JWT_SECRET` in production
3. Enable HTTPS in production environments
4. Regularly rotate API keys and secrets
5. Keep dependencies updated for security patches
6. Monitor Redis and apply security configurations
7. Implement proper error handling (no sensitive data in errors)

## Data Sources and Attributions

### OpenFDA
This application uses data from the U.S. Food and Drug Administration (FDA) through the openFDA API:
- **Adverse Event Reports**: CVM (Center for Veterinary Medicine) adverse event database
- **Product Recalls**: Animal drug and product recall data
- **Green Book**: FDA-approved animal drug products database

**Attribution**: "This product uses publicly available data from the U.S. Food and Drug Administration (FDA), but it is not endorsed or certified by the FDA."

**OpenFDA Terms**: https://open.fda.gov/terms/

### Google Services
- **Google OAuth 2.0**: User authentication
- **Google Places API**: Veterinary clinic location data

### Data Disclaimer
The data provided through this application is for informational purposes only and should not replace professional veterinary advice. Always consult with a licensed veterinarian before making decisions about your pet's healthcare.

## Limitations and Disclaimers

### Important Notices
1. **Not Medical Advice**: PetCheck is an informational tool and does not provide veterinary medical advice. Always consult a licensed veterinarian.

2. **Data Accuracy**: While we strive for accuracy, FDA data may be incomplete or delayed. Adverse event reports are voluntary and may not establish a causal relationship.

3. **Interaction Checker**: The drug interaction checker is based on available data and may not cover all possible interactions. Consult a veterinarian for comprehensive interaction analysis.

4. **API Rate Limits**:
   - Without OpenFDA API key: 40 requests/minute, 1,000/day
   - With OpenFDA API key: 240 requests/minute, 120,000/day

5. **Offline Limitations**: PWA offline mode provides cached data only. Real-time updates require internet connectivity.

6. **Geographic Limitations**: Veterinarian finder is limited to areas covered by Google Places API.

## Progressive Web App (PWA) Features

### Installation
Users can install PetCheck as a standalone app:
- **Desktop**: Click the install button in the address bar
- **Mobile**: Tap "Add to Home Screen" in the browser menu

### Offline Functionality
- Cached drug database for offline searches
- Saved pet profiles accessible offline
- Previously viewed drug details available offline
- Background sync for pending actions

### Service Worker
The application uses Workbox-powered service workers for:
- Smart caching strategies
- Background data synchronization
- Push notification support
- Automatic updates

### Manifest Features
- Standalone display mode
- Custom theme colors
- App icons (192x192, 512x512)
- Orientation preferences
- Categorization as health/medical app

## Development

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (backend)
npm run test:watch -w @petcheck/backend

# Run tests for specific package
npm test -w @petcheck/frontend
```

### Linting and Formatting

```bash
# Lint all packages
npm run lint

# Format code with Prettier
npm run format
```

### Building Packages

```bash
# Build all packages
npm run build

# Build specific package
npm run build:backend
npm run build:frontend
npm run build:shared
```

### Clean Build Artifacts

```bash
npm run clean
```

## Contributing

We welcome contributions from the community! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details on:
- Code of conduct
- Development workflow
- Pull request process
- Coding standards
- Testing requirements

### Quick Contribution Guide
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests and linting (`npm test && npm run lint`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- **FDA/CVM** - For providing open access to animal drug safety data
- **OpenFDA Team** - For maintaining excellent API documentation
- **React Team** - For the amazing React framework
- **Vite Team** - For the blazing-fast build tool
- **All Contributors** - Thank you for your contributions!

## Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/petcheck/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/petcheck/discussions)
- **Email**: support@petcheck.example.com

## Roadmap

- [ ] OpenAPI/Swagger documentation
- [ ] Email notifications for recalls
- [ ] Export to PDF (pet medication records)
- [ ] Multi-language support
- [ ] Veterinary prescription integration
- [ ] Compounding pharmacy directory
- [ ] Clinical trial database integration
- [ ] Mobile native apps (React Native)

---

**Disclaimer**: This application is not affiliated with, endorsed by, or sponsored by the U.S. Food and Drug Administration (FDA). The information provided is for educational and informational purposes only.

Made with care for pets and their owners.
