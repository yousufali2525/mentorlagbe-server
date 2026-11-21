# MentorLagbe Server
REST API for the MentorLagbe Smart Tuition & Mentorship Platform.

## Purpose
Students and parents struggle to find verified tutors by subject, class level, mode (Online/Offline) and monthly budget. Tutors lack a structured platform to showcase batches and manage student enrollments. This server powers MentorLagbe: authentication, role-based access, tuition moderation, applications and Stripe Pro subscriptions.

## Live URL
- Server API: <SERVER LIVE URL>
- Client: https://mentor-lagbe-client-rouge.vercel.app/
- GitHub (Server): <SERVER GITHUB URL>
- GitHub (Client): https://github.com/yousufali2525/MentorLagbe-Client

## Test Credentials (Admin, Tutor, Student)

| Role | Email | Password |
|------|-------|----------|
| Admin | <ADMIN EMAIL> | <ADMIN PASSWORD> |
| Tutor | <TUTOR EMAIL> | <TUTOR PASSWORD> |
| Student | <STUDENT EMAIL> | <STUDENT PASSWORD> |

## Key Features
- **Better Auth with MongoDB adapter**: Email/password authentication using Better Auth and `@better-auth/mongo-adapter`, with separate auth and app databases.
- **Role selection at sign-up**: Users register as `student` or `tutor`; role is normalized on the server and unsafe role/plan updates are blocked.
- **Default free plan**: New users are created with `plan: "free"` and `isActive: true`.
- **JWT issue/verify flow**: `GET /api/token` resolves a Better Auth session (cookie, or `Authorization: Bearer <session-token>` fallback) and issues a signed HS256 JWT for API access.
- **Custom auth middlewares**: `verifyToken`, `verifyStudent`, `verifyTutor`, and `verifyAdmin` protect routes and enforce role-based access.
- **Server-side tuition search/filter/pagination**: Public tuition listing supports `search` (title/subject), `subject`, `classLevel`, `mode`, `location`, `category`, `page`, and `limit` with MongoDB `skip()`/`limit()` and `countDocuments()`.
- **Tuition approval flow**: New/updated tutor tuitions are submitted as `pending`; admins can approve or reject them. Public listing returns only approved, active tuitions.
- **Free plan tuition limit**: Free tutors can post up to 2 tuitions; Pro tutors have unlimited postings.
- **Student applications with duplicate prevention**: Students can apply to approved/active tuitions; duplicate applications are prevented by app checks and a unique MongoDB index on `(tuitionId, studentId)`.
- **Applicant management**: Tutors can view applicants for their tuitions and accept/reject pending applications.
- **Admin user management**: Admins can list users, activate/deactivate non-admin accounts, and change user roles to `student`, `tutor`, or `admin`; an admin cannot remove their own admin role.
- **Admin dashboard stats and revenue**: Admin stats include user/tuition/application/payment counts and total paid revenue.
- **ImgBB image upload**: Authenticated users can upload base64 images (PNG/JPEG/JPG/WEBP, max 8 MB) through the ImgBB API.
- **Stripe Pro subscriptions**: Stripe Checkout creates Pro purchases (Tutor $15, Student $10). Payment fulfillment is idempotent via webhook (`POST /api/payments/webhook`) and client verification (`GET /api/payments/verify-session`).
- **Seed and admin scripts**: `scripts/seed.js` upserts demo tutor/tuitions and migrates missing tuition fields; `scripts/createAdmin.js` promotes an existing user to admin by `ADMIN_EMAIL`.

## Database Collections

The app uses MongoDB with an app database (`DB_NAME`, default `mentorlagbe`) and an auth database (`AUTH_DB_NAME`, default `mentorlagbe_auth`). Better Auth manages its own auth collections in the auth database (for example `user`, `session`, `account`, `verification`).

| Collection | Key Fields | Notes |
|------------|------------|-------|
| `users` | `_id`, `name`, `email`, `role`, `plan`, `profileImage`, `phone`, `location`, `bio`, `isActive`, `createdAt`, `updatedAt` | App user profile synced from Better Auth. `role`: `student`/`tutor`/`admin`. `plan`: `free`/`pro`. API returns profile image as `profileImage` (not `image`). Unique index on `email`. |
| `tuitions` | `_id`, `title`, `subject`, `classLevel`, `mode`, `location`, `monthlyFee`, `salary`, `daysPerWeek`, `description`, `category`, `bannerImage`, `banner`, `tutorId`, `tutorName`, `tutorEmail`, `approvalStatus`, `isActive`, `createdAt`, `updatedAt` | `approvalStatus`: `pending`/`approved`/`rejected`. `mode`: `Online`/`Offline`. API returns both `monthlyFee/salary` and `bannerImage/banner`. Index on `approvalStatus, isActive, createdAt`. |
| `applications` | `_id`, `tuitionId`, `tuitionTitle`, `subject`, `monthlyFee`, `tutorId`, `tutorName`, `tutorEmail`, `studentId`, `studentName`, `studentEmail`, `studentPhone`, `preferredSchedule`, `studentNote`, `message`, `status`, `appliedAt`, `createdAt`, `updatedAt` | `status`: `pending`/`accepted`/`rejected`. Unique index on `tuitionId + studentId` (`unique_tuition_student`) prevents duplicates. |
| `payments` | `_id`, `userId`, `userName`, `userEmail`, `userRole`, `role`, `plan`, `planName`, `amount`, `currency`, `transactionId`, `stripeSessionId`, `paymentStatus`, `paidAt`, `email`, `createdAt` | Stripe payment record. `stripeSessionId` has a unique sparse index for idempotent fulfillment. |

## API Endpoints

### Public

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/` | Public | Welcome message for the API. |
| GET | `/api/health` | Public | Health check endpoint. |
| GET | `/api/tuitions` | Public | List approved, active tuitions. Supports `search`, `subject`, `classLevel`, `mode`, `location`, `category`, `page`, `limit`. Returns paginated/compatible tuition payload. |
| GET | `/api/tuitions/:id` | Public | Get a single approved, active tuition by ID. |

### Auth

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| ALL | `/api/auth/*` | Public (Better Auth) | Better Auth handler for sign-up, sign-in, session, and auth operations. |
| GET | `/api/token` | Better Auth session (cookie or bearer token) | Resolves Better Auth session and returns a signed JWT plus basic user info for protected API calls. |

### Student

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/applications` | `verifyToken`, `verifyStudent` | Apply to an approved, active tuition. Prevents duplicate applications and self-application. |
| GET | `/api/applications/my-applications` | `verifyToken`, `verifyStudent` | Get the logged-in student's applications with enriched tuition/tutor details. |
| DELETE | `/api/applications/:id` | `verifyToken`, `verifyStudent` | Cancel a pending application owned by the logged-in student. |

### Tutor

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/tuitions/my-tuitions` | `verifyToken`, `verifyTutor` | Get tuitions created by the logged-in tutor. |
| POST | `/api/tuitions` | `verifyToken`, `verifyTutor` | Create a tuition. Free tutors are limited to 2 tuitions; Pro tutors have unlimited postings. New tuitions start as `pending`. |
| PATCH | `/api/tuitions/:id` | `verifyToken`, `verifyTutor` (owner) | Update a tuition. Full updates reset `approvalStatus` to `pending`. Supports isActive-only toggle payload. |
| PATCH | `/api/tuitions/:id/active` | `verifyToken`, `verifyTutor` (owner) | Activate/deactivate a tutor-owned tuition with `{ isActive: boolean }`. |
| DELETE | `/api/tuitions/:id` | `verifyToken`, `verifyTutor` (owner) | Delete a tutor-owned tuition. |
| GET | `/api/applications/tutor-applicants` | `verifyToken`, `verifyTutor` | Get applications submitted to the tutor's tuitions. |
| PATCH | `/api/applications/:id/status` | `verifyToken`, `verifyTutor` (owner) | Accept or reject a pending application (`accepted`/`rejected`). |

### Admin

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/admin/stats` | `verifyToken`, `verifyAdmin` | Dashboard stats: users, tuitions, applications, payments, and total paid revenue. |
| GET | `/api/admin/users` | `verifyToken`, `verifyAdmin` | List users with pagination, role filter, and name/email search. |
| PATCH | `/api/admin/users/:id/status` | `verifyToken`, `verifyAdmin` | Activate/deactivate a non-admin user. Admin cannot deactivate own account here. |
| PATCH | `/api/admin/users/:id/role` | `verifyToken`, `verifyAdmin` | Change a user's role to `student`, `tutor`, or `admin`. An admin cannot remove their own admin role. |
| GET | `/api/admin/tuitions` | `verifyToken`, `verifyAdmin` | List all tuitions with optional `status`, `search`, `page`, `limit`. |
| GET | `/api/admin/tuitions/pending` | `verifyToken`, `verifyAdmin` | List pending tuitions. |
| PATCH | `/api/tuitions/admin/:id/status` | `verifyToken`, `verifyAdmin` | Approve or reject a tuition (`approved`/`rejected`). |
| GET | `/api/admin/payments` | `verifyToken`, `verifyAdmin` | List payment transactions with pagination. Response includes `totalRevenue` (sum of payment `amount` values) alongside `payments` and `pagination`. |

### Profile / Upload

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/users/me` | `verifyToken` | Get the logged-in user's profile. |
| PATCH | `/api/users/me` | `verifyToken` | Update profile fields: `name`, `phone`, `location`, `bio`, `profileImage` (HTTPS URL). Syncs name/image to Better Auth user record. |
| POST | `/api/upload/image` | `verifyToken` | Upload a base64 image to ImgBB and return hosted URLs. |

### Payments

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/payments/create-checkout-session` | `verifyToken` | Create a Stripe Checkout session for Pro upgrade. Tutor: $15, Student: $10. |
| GET | `/api/payments/verify-session` | `verifyToken` | Verify a Stripe Checkout session by `session_id`, confirm ownership/payment, fulfill idempotently, return `{ success, plan }`. |
| GET | `/api/payments/my-payments` | `verifyToken` | Get payment history for the logged-in user. |
| POST | `/api/payments/webhook` | Stripe signature (`stripe-signature`) | Stripe webhook for `checkout.session.completed`; verifies signature and fulfills payment idempotently. Raw body required. |

## NPM Packages Used

### Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `@better-auth/mongo-adapter` | `^1.7.25` | MongoDB adapter for Better Auth. |
| `better-auth` | `^1.7.25` | Authentication framework for email/password auth and session handling. |
| `cors` | `^2.8.6` | Express CORS middleware for client origin and credential support. |
| `dotenv` | `^18.0.10` | Loads environment variables from `.env` for local development/runtime config. |
| `express` | `^4.22.3` | HTTP server and routing framework. |
| `jsonwebtoken` | `^9.0.3` | Signs and verifies JWTs used by protected API routes. |
| `mongodb` | `^7.9.0` | MongoDB native driver for app/auth database access. |
| `stripe` | `^23.1.0` | Stripe SDK for Checkout sessions, webhook verification, and payment retrieval. |

### DevDependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `kill-port` | `^2.0.1` | Frees port 5000 before starting dev/start scripts. |
| `nodemon` | `^3.1.14` | Restarts the server automatically during development. |

## Environment Variables

| Variable | Description |
|----------|-------------|
| `MONGODB_URI` | MongoDB connection string. |
| `DB_NAME` | App database name (defaults to `mentorlagbe` if not set). |
| `AUTH_DB_NAME` | Better Auth database name (defaults to `mentorlagbe_auth` if not set). |
| `BETTER_AUTH_URL` | Public base URL of this server for Better Auth. |
| `BETTER_AUTH_SECRET` | Secret used by Better Auth. |
| `JWT_SECRET` | Secret used to sign and verify API JWTs. |
| `JWT_EXPIRES_IN` | JWT expiration (optional, defaults to `7d`). |
| `IMGBB_API_KEY` | ImgBB API key for image uploads. |
| `STRIPE_SECRET_KEY` | Stripe secret key for Checkout/session operations. |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret. |
| `FRONTEND_URL` | Preferred frontend URL for Stripe success/cancel redirects. |
| `CLIENT_URL` | Allowed client origin(s) for CORS; comma-separated values supported. |
| `PORT` | Server port (defaults to `5000`). |
| `NODE_ENV` | Runtime environment; production enables secure cross-site auth cookies. |
| `ADMIN_EMAIL` | Email used by `scripts/createAdmin.js` to promote an existing user to admin. |

```env
# MongoDB
MONGODB_URI=your_mongodb_connection_string
DB_NAME=mentorlagbe
AUTH_DB_NAME=mentorlagbe_auth

# Better Auth
BETTER_AUTH_URL=http://localhost:5000
BETTER_AUTH_SECRET=your_better_auth_secret

# JWT
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d

# ImgBB
IMGBB_API_KEY=your_imgbb_api_key

# Stripe
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# Client / CORS
FRONTEND_URL=http://localhost:3000
CLIENT_URL=http://localhost:3000

# Server
PORT=5000
NODE_ENV=development

# Admin script
ADMIN_EMAIL=admin@example.com
```

## Getting Started

1. **Clone the repository**
   ```bash
   git clone <SERVER GITHUB URL>
   cd <server-repo-folder>
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create environment file**
   - Create a `.env` file in the server root.
   - Add the variables shown above with your own local/deployment values.

4. **Run the seed script (optional, for demo data)**
   ```bash
   npm run seed
   ```
   This runs `node scripts/seed.js`, upserts a demo tutor, seeds 12 approved tuitions, and migrates missing tuition fields.

5. **Start the server**
   ```bash
   npm run dev
   ```
   For a non-watch start:
   ```bash
   npm start
   ```

## Deployment

- **Hosting**: No deploy config files (`vercel.json`, `render.yaml`, `Procfile`, `Dockerfile`, etc.) are included in this repo. Deploy as a Node.js web service using `npm install` and `npm start`/`node index.js`, and set all required environment variables in the host dashboard.
- **CORS**: Set `CLIENT_URL` to the exact client origin(s), including `https://mentor-lagbe-client-rouge.vercel.app`. The server uses credentialed CORS and allows configured origins plus Vercel preview origins matching the client pattern.
- **Auth cookies/cross-domain**: In production set `NODE_ENV=production`, `BETTER_AUTH_URL` to the public HTTPS server URL, and ensure frontend requests use credentials.
- **Stripe webhook**: Configure a Stripe webhook endpoint pointing to `POST <SERVER LIVE URL>/api/payments/webhook` with the `checkout.session.completed` event. Use the matching `STRIPE_WEBHOOK_SECRET` from Stripe.

## Author
Yousuf Ali (GitHub: yousufali2525)