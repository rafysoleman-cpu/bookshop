# BookShop

BookShop is an online bookstore with a customer storefront and a single-owner admin panel. It is built as a monorepo with a React frontend and an Express/MongoDB backend.

The catalog uses books rather than generic products: each title has an author, ISBN, publisher, page count, format, language, edition, and publication date.

## Features

### Storefront
- Browse and search books by title, author, publisher, or genre
- Genre, price, rating, and availability filters
- Book detail pages with cover images and real customer reviews
- Guest and authenticated cart
- Wishlist for signed-in customers
- Coupons and flash sales
- Checkout with saved addresses and cash on delivery
- Order history and order tracking
- Blog, contact, FAQ, and about pages
- Google OAuth and email/password authentication
- Responsive light and dark themes

### Admin
- Dashboard with real order, user, book, and revenue totals
- Analytics with sales trends, registrations, and top books
- Book management with book-specific metadata and image uploads
- Genre management
- Order and customer management
- Coupon management

## Tech Stack

### Backend
- Node.js and Express
- MongoDB with Mongoose
- Redis and BullMQ for caching and email jobs
- JWT authentication with optional Google OAuth
- Socket.io
- Joi validation
- Multer, Sharp, ImageKit, and S3-compatible storage
- Nodemailer

### Frontend
- React 18 and Vite
- React Router
- Zustand
- React Query
- Tailwind CSS
- Axios
- React Hook Form
- Lucide icons

## Project Structure

```text
bookshop/
|-- apps/
|   |-- backend/          # Express API
|   |   |-- src/
|   |   |   |-- config/   # Environment, database, Redis, uploads
|   |   |   |-- controllers/
|   |   |   |-- jobs/
|   |   |   |-- middlewares/
|   |   |   |-- models/
|   |   |   |-- routes/
|   |   |   |-- services/
|   |   |   |-- sockets/
|   |   |   `-- utils/
|   |   `-- package.json
|   `-- frontend/         # React storefront and admin panel
|       |-- src/
|       |   |-- components/
|       |   |-- config/
|       |   |-- hooks/
|       |   |-- layouts/
|       |   |-- pages/
|       |   |-- services/
|       |   |-- store/
|       |   `-- utils/
|       `-- package.json
|-- packages/
|   `-- shared/
|-- package.json
`-- README.md
```

## Prerequisites

- Node.js 20 LTS or newer
- npm 9 or newer
- MongoDB Atlas or a local MongoDB instance
- Redis

## Local Setup

1. Install dependencies from the repository root:

```bash
npm install
```

2. Create environment files:

```bash
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env
```

3. Fill in the backend values for MongoDB, JWT, Redis, email, OAuth, and image storage. Set the frontend API and socket URLs to match the backend port.

4. Start Redis in WSL and both applications:

```bash
npm run devall
```

This starts Redis without a `sudo` prompt, waits for `redis-cli ping` to return `PONG`, then starts the backend and frontend. If Redis is already running, `npm run dev` starts only the applications.

The frontend runs at `http://localhost:3001` and the API at `http://localhost:5001`.

## Environment

Backend defaults are documented in `apps/backend/.env.example`. At minimum, configure:

- `MONGODB_URI`
- `JWT_SECRET`
- `REDIS_URL`
- `FRONTEND_URL`
- `CORS_ORIGIN`
- `ADMIN_EMAILS`

Frontend defaults are documented in `apps/frontend/.env.example`:

- `VITE_API_URL`
- `VITE_SOCKET_URL`
- `VITE_GOOGLE_CLIENT_ID`

Never commit real `.env` files or credentials.

## Scripts

From the repository root:

```bash
npm run dev          # Run backend and frontend together
npm run devall       # Start WSL Redis, wait for PONG, then run both apps
npm run dev:backend  # Run the API only
npm run dev:frontend # Run the frontend only
npm run build        # Build all workspaces
npm run lint         # Lint all workspaces
```

## Admin Access

Admin routes are available at `/admin`. Access is restricted to the email addresses listed in `ADMIN_EMAILS`.

Add books through the admin panel after signing in. The repository intentionally contains no seed catalog, demo reviews, or placeholder books.

## Payments

Checkout currently supports cash on delivery only. No live card or mobile-banking gateway is configured, and the API does not simulate successful online payments.

## Deployment

- Frontend: any static Vite host such as Vercel
- Backend: any Node.js host such as Railway
- Database: MongoDB Atlas
- Redis: managed Redis or a private instance

Set the production environment variables in the hosting dashboards. The included `railway.json` and `vercel.json` files provide build and start defaults.

Set `REDIS_URL` to the managed Redis URL supplied by the host. Do not use `127.0.0.1` or a WSL IP in production. Use the provider's database number; many hosted Redis services only support database `0`.
