# Resume Optimizer Frontend

React + Vite frontend application for the Resume Optimizer AI platform.

## Tech Stack

- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **UI Library**: Ant Design 5
- **State Management**: Zustand
- **HTTP Client**: Axios
- **Routing**: React Router v6
- **Testing**: Vitest

## Project Structure

```
src/
├── config/          # Configuration files (axios, theme)
├── components/      # Reusable components
├── layouts/         # Layout components
├── pages/           # Page components
├── router/          # Router configuration
├── services/        # API service layer
├── stores/          # Zustand state stores
├── App.tsx          # Root component
├── main.tsx         # Entry point
└── index.css        # Global styles
```

## State Management

The application uses Zustand for state management with the following stores:

- **authStore**: User authentication state
- **resumeStore**: Resume management state
- **jobStore**: Job management state
- **optimizationStore**: Optimization results state

## API Services

All API calls are organized in the `services/` directory:

- **authService**: Authentication endpoints
- **resumeService**: Resume CRUD operations
- **jobService**: Job CRUD operations
- **optimizationService**: Optimization operations

## Setup

1. Install dependencies (from root):

```bash
npm install
```

2. Configure environment variables:

```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Start development server:

```bash
npm run dev
```

The application will be available at http://localhost:5173

## Building for Production

```bash
npm run build
```

## Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch
```

## Features Implemented

- ✅ React + Vite project setup
- ✅ Ant Design UI library configuration with Chinese locale
- ✅ Zustand state management stores (auth, resume, job, optimization)
- ✅ Axios HTTP client with interceptors for auth and error handling
- ✅ React Router with protected routes
- ✅ Main layout with navigation sidebar
- ✅ Basic page components (Login, Register, Dashboard, Resumes, Jobs, Optimize)
- ✅ API service layer for all backend endpoints
- ✅ Custom theme configuration
