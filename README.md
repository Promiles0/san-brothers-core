# San Brothers Core

A comprehensive professional services platform built with modern web technologies, offering accounting, visa processing, translation, and business consultancy services across multiple portals.

## Overview

San Brothers is a multi-portal web application designed to serve clients globally with professional services. The platform features:

- **Visa & Permits Services**: Tourist, Business, Student Visa, and Work Permit processing
- **Translation Services**: Document translation, live interpretation, and certified translation
- **Accounting Services**: Bookkeeping, tax filing, financial reporting, and audit support
- **Business Consultancy**: Company registration, business planning, and trade & investment support

The application is deployed across multiple portals:
- **San Brothers** (`san-brothers`): Main portal with all services
- **Translate Portal** (`translate`): Specialized translation and interpretation services
- **Consultancy Portal** (`consultancy`): Business consultancy and registration services

## Technology Stack

### Frontend
- **Framework**: React 19 with TypeScript
- **Router**: TanStack Router (React Router v2)
- **Build Tool**: Vite
- **Styling**: TailwindCSS v4 with Radix UI components
- **State Management**: TanStack Query (React Query) for server state
- **Forms**: React Hook Form with Zod validation
- **UI Components**: Custom Radix UI-based component library
- **Internationalization**: Custom i18n provider (English, Chinese, Kinyarwanda)

### Backend & Services
- **Server**: Cloudflare Workers (via TanStack Start)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth with Google OAuth
- **Payments**: Stripe integration
- **Video/Calls**: Daily.co for live interpreter sessions
- **Package Manager**: Bun

### DevOps & Deployment
- **CI/CD**: GitHub Actions
- **Deployment**: Cloudflare Workers with Wrangler
- **Environment Management**: GitHub Secrets for sensitive variables

## Project Structure

```
san-brothers-core/
├── src/
│   ├── components/          # React components organized by feature
│   │   ├── auth/            # Authentication-related components
│   │   ├── dashboard/       # Dashboard-specific components
│   │   ├── layout/          # Layout wrappers for different portals
│   │   ├── marketing/       # Public-facing marketing components
│   │   ├── messaging/       # Messaging/notification components
│   │   ├── payments/        # Payment-related components
│   │   ├── shared/          # Shared/reusable components
│   │   ├── staff/           # Staff portal components
│   │   └── ui/              # Base UI components (buttons, cards, etc.)
│   ├── routes/              # TanStack Router route definitions
│   │   ├── __root.tsx       # Root layout and providers
│   │   ├── index.tsx        # Home/landing page
│   │   ├── admin.*.tsx      # Admin portal routes
│   │   ├── dashboard.*.tsx  # Client dashboard routes
│   │   ├── staff.*.tsx      # Staff portal routes
│   │   ├── services.*.tsx   # Service detail pages
│   │   ├── translate/       # Translate portal routes
│   │   └── consultancy/     # Consultancy portal routes
│   ├── lib/                 # Utilities and helpers
│   │   ├── providers/       # React context providers (theme, i18n)
│   │   ├── auth-context.tsx # Authentication state management
│   │   ├── portal-context.ts # Portal detection and configuration
│   │   ├── supabase.ts      # Supabase client setup
│   │   ├── types/           # TypeScript type definitions
│   │   └── utils.ts         # Utility functions
│   ├── messages/            # i18n translation files (en.json, zh.json, rw.json)
│   ├── styles.css           # Global styles and Tailwind imports
│   ├── server.ts            # Server entry point for Cloudflare Workers
│   └── start.ts             # Client entry point
├── public/                  # Static assets
├── docs/                    # Documentation (migrations, etc.)
├── .github/workflows/       # GitHub Actions CI/CD workflows
├── vite.config.ts           # Vite configuration
├── wrangler.jsonc           # Cloudflare Workers configuration
├── tsconfig.json            # TypeScript configuration
├── tailwind.config.ts       # Tailwind CSS configuration
├── eslint.config.js         # ESLint configuration
├── .prettierrc               # Prettier configuration
└── package.json             # Project dependencies
```

## Getting Started

### Prerequisites

- **Node.js**: v18 or higher
- **Bun**: Latest version (https://bun.sh)
- **Git**: For version control

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Promiles0/san-brothers-core.git
   cd san-brothers-core
   ```

2. **Install dependencies**:
   ```bash
   bun install
   ```

3. **Set up environment variables**:
   Create a `.env.local` file in the root directory with the following variables:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_DAILY_CO_API_KEY=your_daily_co_api_key
   VITE_DAILY_CO_DOMAIN=your_daily_co_domain
   VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
   VITE_ANTHROPIC_API_KEY=your_anthropic_api_key (for AI Chat Widget)
   ```

### Development

Start the development server:
```bash
bun run dev
```

The application will be available at `http://localhost:3000`.

### Building

Build the project for production:
```bash
bun run build
```

Preview the production build locally:
```bash
bun run preview
```

### Code Quality

Run linting:
```bash
bun run lint
```

Format code:
```bash
bun run format
```

## Architecture & Key Concepts

### Portal Detection

The application uses a portal-based architecture to serve different services from a single codebase. Portal detection is handled by the `usePortal()` hook from `src/lib/portal-context.ts`:

```typescript
import { usePortal } from "@/lib/portal-context";

function MyComponent() {
  const { current, displayName, config } = usePortal();
  // current: "san-brothers" | "translate" | "consultancy"
  // displayName: "San Brothers" | "Translate Portal" | "Business Consultancy"
}
```

Portals can be detected via:
- **Subdomain**: `translate.sanbrothers.com`, `consultancy.sanbrothers.com`
- **Path**: `/translate/*`, `/consultancy/*` on the main domain

### Authentication Flow

1. User logs in via Supabase Auth (email/password or Google OAuth)
2. Supabase session is stored in browser storage
3. `AuthProvider` in `__root.tsx` manages authentication state
4. Protected routes check authentication status and redirect to login if needed
5. User role determines access to different portals (client, staff, admin, etc.)

### Styling & Theme

- **TailwindCSS v4**: Utility-first CSS framework
- **Dark Mode**: Supported via CSS custom properties and theme provider
- **Radix UI**: Headless component library for accessible UI elements
- **Custom Colors**: Defined in `tailwind.config.ts` with CSS variables

### Internationalization (i18n)

The application supports three languages:
- **English** (`en`)
- **Chinese** (`zh`)
- **Kinyarwanda** (`rw`)

Language preference is stored in localStorage and can be changed via the `useI18n()` hook:

```typescript
import { useI18n } from "@/lib/providers/i18n-provider";

function MyComponent() {
  const { t, locale, setLocale } = useI18n();
  return <h1>{t("common.welcome")}</h1>;
}
```

## Deployment

### Cloudflare Workers Deployment

The application is deployed to Cloudflare Workers via GitHub Actions. The deployment process is automated:

1. Push to the `main` branch triggers the CI/CD pipeline
2. Dependencies are installed with `bun install --frozen-lockfile`
3. Project is built with `bun run build`
4. Built artifacts are deployed to Cloudflare Workers using Wrangler

**Environment Variables** (configured in GitHub Secrets):
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_DAILY_CO_API_KEY`
- `VITE_DAILY_CO_DOMAIN`
- `VITE_STRIPE_PUBLISHABLE_KEY`
- `VITE_ANTHROPIC_API_KEY`
- `CLOUDFLARE_API_TOKEN`

### Manual Deployment

To deploy manually:
```bash
bun run build
npx wrangler deploy
```

## Contributing

We welcome contributions! Please follow these guidelines:

### Commit Message Convention

We use Conventional Commits for clear, structured commit messages:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`

**Examples**:
- `feat(auth): add two-factor authentication`
- `fix(dashboard): resolve payment calculation bug`
- `docs(readme): update setup instructions`
- `refactor(components): simplify button component`

### Code Style

- **TypeScript**: Use strict mode with proper type annotations
- **React**: Use functional components with hooks
- **Naming**: PascalCase for components, camelCase for functions/variables
- **Imports**: Organize imports (React, third-party, local) with blank lines between groups

### Pull Request Process

1. Create a feature branch: `git checkout -b feat/your-feature`
2. Make your changes and commit with conventional messages
3. Push to your fork: `git push origin feat/your-feature`
4. Open a Pull Request with a clear description
5. Ensure CI/CD checks pass
6. Request review from maintainers

## Troubleshooting

### Common Issues

**Issue**: `bun install` fails with permission errors
- **Solution**: Ensure you have write permissions in the project directory and that Bun is properly installed.

**Issue**: Environment variables are not loading
- **Solution**: Verify that `.env.local` is in the root directory and contains all required variables. Restart the dev server after changes.

**Issue**: Supabase connection fails
- **Solution**: Check that `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are correct and that your Supabase project is active.

**Issue**: Build fails with TypeScript errors
- **Solution**: Run `bun run lint` to identify issues. Ensure all types are properly defined and no `any` types are used without justification.

## Performance Optimization

- **Code Splitting**: Routes are automatically code-split by TanStack Router
- **Lazy Loading**: Components are lazy-loaded where appropriate
- **Caching**: Cloudflare Workers cache static assets and API responses
- **Image Optimization**: Use responsive images and modern formats (WebP, AVIF)

## Security Considerations

- **Secrets Management**: All sensitive data is stored in GitHub Secrets and never committed to the repository
- **Authentication**: Supabase handles secure authentication and session management
- **API Security**: All API calls are made over HTTPS; sensitive operations require authentication
- **Input Validation**: All user inputs are validated on both client and server sides
- **Error Handling**: Error messages are generic to prevent information leakage

## License

This project is proprietary and confidential. Unauthorized copying or distribution is prohibited.

## Contact & Support

For questions or support, please contact:
- **Email**: sanbrothersgroup@gmail.com
- **Phone**: +250 788 687 288 / +250 788 453 192
- **Location**: Florida House, 2nd Floor, KN 70 Street, Kigali, Rwanda
- **Hours**: Monday - Friday, 8:00 AM - 6:00 PM CAT

## Changelog

### Version 1.0.0 (Current)
- Initial release with multi-portal architecture
- Full authentication and authorization system
- Visa, translation, accounting, and consultancy services
- Admin and staff management dashboards
- Payment processing via Stripe
- Live interpreter sessions via Daily.co
- Internationalization support (EN, ZH, RW)
