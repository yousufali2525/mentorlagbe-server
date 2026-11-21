# MentorLagbe

Smart Tuition & Mentorship Platform.

## Purpose

Students and parents struggle to find verified tutors by subject, class level, mode (Online/Offline) and monthly budget. Tutors lack a structured platform to showcase batches and manage student enrollments. MentorLagbe solves both in one role-based ecosystem with three roles: Student, Tutor and Admin.

## Live URL

- Client: https://mentor-lagbe-client-rouge.vercel.app/
- Server: https://mentorlagbe-server-s98a.onrender.com
- GitHub (Client): https://github.com/yousufali2525/MentorLagbe-Client
- GitHub (Server): https://github.com/yousufali2525/mentorlagbe-server

## Test Credentials (Admin, Tutor, Student)

| Role | Email | Password |
|---|---|---|
| Admin | yousufali025250@gmail.com | Asdfghjkl |
| Tutor | yousufali37@gmail.com | Asdfghjkl |
| Student | yousufali@gmail.com | Asdfghjkl |

> The server is hosted on Render's free plan, so the first request after a period of inactivity may take 30-60 seconds.

## Key Features

**Public**

- Landing page with hero search, 6 latest approved tuitions, pricing, How It Works, top subjects, platform statistics and testimonials.
- Tuition browser at `/tuitions` with server-side search, subject/class-level/mode filters and pagination; filters are stored in the URL.
- Tuition detail pages at `/tuitions/[id]` with tutor information and a student application form.
- Pricing page with Free and Pro plans for students and tutors, plus payment success and cancel pages.

**Authentication**

- Better Auth sign-in and sign-up with role selection (Student or Tutor) and form validation.
- Role-aware route guards and redirects for the Student, Tutor and Admin dashboards.
- Better Auth session exchange into a backend JWT, stored-JWT fallback, bearer-token API requests and automatic refresh after a 401 response.
- Session and profile image persist after page reload.

**Student**

- Dashboard with overview statistics, recent applications and a Pro upgrade banner.
- In-dashboard tuition browser at `/dashboard/student/browse` that keeps the sidebar and top bar visible.
- Apply form with phone number, preferred schedule and learning note (student-only, duplicate applications blocked).
- My Applications page with status badges, filters and cancellation of pending applications.

**Tutor**

- Dashboard with overview statistics, quick actions and a Pro upgrade banner.
- Post Tuition form with ImgBB banner upload (Free plan: up to 2 posts, Pro: unlimited).
- My Tuitions page with approval status, edit, delete and active/closed toggle.
- Applicants page showing student phone, schedule and note, with accept/reject actions.

**Admin**

- Dashboard with platform statistics and revenue.
- User management with search, active/inactive status and role changes between Student, Tutor and Admin.
- Tuition management with pending/approved/rejected tabs and approve/reject actions.
- Transactions page listing Stripe payments with total revenue.

**Shared**

- Update Profile page (name, phone, bio, profile image upload via ImgBB).
- Stripe Checkout for the Pro plan (Tutor $15, Student $10).
- Responsive dashboard with collapsible sidebar, top bar and mobile navigation.
- Dark/light theme toggle.
- Loading skeletons, custom 404 and error pages, and toast notifications.

## Tech Stack

- **Framework:** Next.js 16 (App Router), React 19, TypeScript
- **Styling:** Tailwind CSS 4
- **Authentication:** Better Auth with JWT-backed API sessions
- **UI:** Lucide icons, Framer Motion, Sonner toasts
- **Payments and media:** Stripe Checkout, ImgBB (handled by the backend)
- **Backend:** Node.js, Express, MongoDB (see the server repository)

## NPM Packages Used

### Dependencies

| Package | Version | Purpose |
|---|---|---|
| `better-auth` | `^1.7.27` | Authentication client and session handling |
| `framer-motion` | `^12.43.0` | UI animations and scroll reveals |
| `lucide-react` | `^1.77.0` | Icon library |
| `next` | `16.4.6` | Next.js App Router framework |
| `react` | `19.3.0` | React UI library |
| `react-dom` | `19.3.0` | React DOM rendering |
| `sonner` | `^2.0.8` | Toast notifications |

### DevDependencies

| Package | Version | Purpose |
|---|---|---|
| `@tailwindcss/turbopack` | `4.3.3` | Tailwind CSS integration for Turbopack |
| `@types/node` | `^20` | Node.js type definitions |
| `@types/react` | `^19` | React type definitions |
| `@types/react-dom` | `^19` | React DOM type definitions |
| `eslint` | `^9` | Linting |
| `eslint-config-next` | `16.4.6` | Next.js ESLint configuration |
| `tailwindcss` | `4.3.3` | Utility-first CSS framework |
| `typescript` | `^5` | Static type checking |

## Environment Variables

| Name | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Express backend origin used by the API client and the Better Auth session exchange. |

Example `.env.local` with a placeholder value only:

```env
NEXT_PUBLIC_API_URL=https://your-server.example.com
```

## Getting Started

1. Clone the repository:

   ```bash
   git clone https://github.com/yousufali2525/MentorLagbe-Client.git
   cd MentorLagbe-Client
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create `.env.local` in the project root using the example above.

4. Start the development server:

   ```bash
   npm run dev
   ```

5. Create a production build and start it:

   ```bash
   npm run build
   npm run start
   ```

## Deployment

The client is deployed on Vercel. The server must allow the client origin in its CORS configuration (`CLIENT_URL`), with credentials and the `Authorization` header enabled.

## Author

Yousuf Ali (GitHub: yousufali2525)