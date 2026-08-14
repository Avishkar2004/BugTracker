# Bug Tracker

A bug tracking and issue management system that helps development teams track, prioritize, and resolve software bugs from discovery to resolution.

**Status**: Working full-stack application (React + Express + MongoDB)

## Problem Statement

In modern software development, teams face significant challenges when managing bugs and issues:

- **Lack of Centralized Tracking**: Bugs are scattered across emails, chat messages, and spreadsheets, making it difficult to maintain a single source of truth
- **Poor Prioritization**: Without a clear system, critical bugs can be overlooked while minor issues consume valuable time
- **Limited Visibility**: Team members struggle to see the status of bugs, who's working on what, and overall project health
- **Inefficient Communication**: Context gets lost in conversations, leading to misunderstandings and delayed resolutions
- **No Historical Data**: Without proper tracking, it's impossible to identify patterns, recurring issues, or measure improvement over time

This Bug Tracker solves these problems with a centralized, intuitive platform for the entire bug lifecycle.

## Features

### Implemented

- **Bug Reporting** — title, description, steps to reproduce, environment, and file attachments
- **Priority Management** — Critical, High, Medium, Low, with priority-ordered sorting
- **Status Tracking** — New → In Progress → Testing → Resolved → Closed
- **Assignment System** — assign to any team member, or leave unassigned
- **Search & Filter** — full-text search plus filters on status, priority, assignee, tags, and open/closed; every filter lives in the URL so views are shareable
- **Comments & Collaboration** — threaded discussion per bug, authors can delete their own
- **Activity History** — a complete audit trail of who changed what and when
- **Dashboard Analytics** — open/critical/unassigned counts, average resolution time, 14-day trend, status and priority breakdowns, per-person workload
- **Tagging System** — free-form lowercase tags, clickable to filter
- **Bulk Operations** — select many bugs, then set status, priority, or assignee in one action
- **Export** — CSV and JSON, honouring the filters currently applied
- **REST API** — token-authenticated JSON API, documented below
- **Authentication & Roles** — JWT auth with `admin`, `developer`, `tester`, `reporter` roles

### Not built yet

- **Email notifications** — no SMTP is wired up; assignment and status changes are recorded in activity history only
- **Board (kanban) view** — the bug list is a table; a drag-and-drop board is the natural next addition
- **OAuth sign-in** — email + password only

## Tech Stack

| Layer | Choice |
| --- | --- |
| Frontend | React 19, Vite 6, React Router 7, Tailwind CSS 4 |
| Charts | Hand-rolled SVG — no charting dependency |
| Backend | Node.js, Express 4 |
| Database | MongoDB with Mongoose |
| Auth | JWT (`jsonwebtoken`) + bcrypt password hashing |
| Uploads | Multer, stored on disk under `server/uploads/` |

## Getting Started

### Prerequisites

- Node.js v18 or higher
- MongoDB running locally (or a MongoDB Atlas connection string)
- Git

### Installation

`server/` and `client/` are two independent npm projects. Each one installs and runs on its own —
there is nothing to install at the top level.

```bash
# Clone the repository
git clone https://github.com/Avishkar2004/BugTracker
cd BugTracker
```

**1. Set up the API**

```bash
cd server
npm install
cp .env.example .env      # then set JWT_SECRET and MONGODB_URI
npm run seed              # loads demo users and bugs (optional but recommended)
npm run dev               # http://localhost:5000
```

**2. Set up the web client** — in a second terminal:

```bash
cd client
npm install
cp .env.example .env
npm run dev               # http://localhost:5173
```

Open http://localhost:5173. The client proxies `/api` to the server, so both need to be running.

### Demo accounts

`npm run seed` (from `server/`) wipes the database and creates five users. All of them use the
password `password123`.

| Email | Role |
| --- | --- |
| `admin@bugtracker.dev` | admin |
| `priya@bugtracker.dev` | developer |
| `marcus@bugtracker.dev` | developer |
| `fatima@bugtracker.dev` | tester |
| `diego@bugtracker.dev` | reporter |

Without seeding, the **first account you register becomes the admin**.

### Scripts

Run these from inside `server/`:

| Command | What it does |
| --- | --- |
| `npm run dev` | API with file watching, on port 5000 |
| `npm run seed` | Resets the database and loads demo data |
| `npm start` | Runs the API in production mode |

Run these from inside `client/`:

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server on port 5173 |
| `npm run build` | Production build into `client/dist` |
| `npm run preview` | Serves the production build locally |

There is deliberately no top-level `package.json`: the two folders are independent projects, so
dependencies stay in `server/node_modules` and `client/node_modules`, each with its own lock file,
and nothing is hoisted into the parent directory.

## Project Structure

```
.
├── server/                  Express + MongoDB API  (own node_modules + lock file)
│   ├── .env.example         server config template
│   ├── src/
│   │   ├── config/          env loading, Mongo connection
│   │   ├── models/          User, Bug, Comment, Activity, Counter
│   │   ├── middleware/      auth, error handling, uploads
│   │   ├── controllers/     auth, users, bugs, stats
│   │   ├── routes/          route tables
│   │   ├── utils/           ApiError, asyncHandler, CSV writer
│   │   ├── app.js           middleware + route mounting
│   │   ├── index.js         server bootstrap
│   │   └── seed.js          demo dataset
│   └── uploads/             attachment storage (gitignored)
└── client/                  React + Vite SPA  (own node_modules + lock file)
    ├── .env.example         client config template
    └── src/
        ├── api/             axios instance with auth interceptor
        ├── components/      layout, shared UI, SVG charts
        ├── context/         AuthContext
        ├── lib/             constants and formatters
        └── pages/           Login, Register, Dashboard, Bugs, BugDetail, NewBug, Team
```

## API Reference

All routes except `/api/health`, `/api/auth/register`, and `/api/auth/login` require an
`Authorization: Bearer <token>` header.

### Auth

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/api/auth/register` | Create an account, returns a token |
| `POST` | `/api/auth/login` | Exchange credentials for a token |
| `GET` | `/api/auth/me` | Current user |

### Bugs

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/bugs` | List with filters and pagination |
| `POST` | `/api/bugs` | Create (accepts `multipart/form-data` for attachments) |
| `GET` | `/api/bugs/:id` | Single bug |
| `PATCH` | `/api/bugs/:id` | Update — every change is written to activity history |
| `DELETE` | `/api/bugs/:id` | Delete (admin only) |
| `PATCH` | `/api/bugs/bulk` | Apply one change to many bugs |
| `GET` | `/api/bugs/export?format=csv\|json` | Export the current filter set |
| `POST` | `/api/bugs/:id/attachments` | Add files to an existing bug |
| `GET`/`POST` | `/api/bugs/:id/comments` | Read and post comments |
| `DELETE` | `/api/bugs/:id/comments/:commentId` | Delete a comment (author or admin) |
| `GET` | `/api/bugs/:id/activity` | Audit trail |

**List query parameters**: `q`, `status`, `priority`, `assignee` (id, `me`, or `unassigned`),
`reporter`, `tags` (comma-separated, matches all), `open=true`, `sort`
(`newest`/`oldest`/`updated`/`priority`/`title`), `page`, `limit`.

### Users & stats

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/users` | Team directory |
| `PATCH` | `/api/users/:id/role` | Change a role (admin only) |
| `GET` | `/api/stats/overview?days=14` | Dashboard aggregates |

### Example

```bash
TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@bugtracker.dev","password":"password123"}' | jq -r .token)

curl -s "http://localhost:5000/api/bugs?priority=Critical&open=true" \
  -H "Authorization: Bearer $TOKEN" | jq '.bugs[].title'
```

## Permissions

| Action | Who |
| --- | --- |
| Report a bug, comment | Any signed-in user |
| Edit a bug | Its reporter, its assignee, any developer, any admin |
| Delete a bug | Admin |
| Delete a comment | Its author, or an admin |
| Change a user's role | Admin (and never their own) |

## Usage

### Creating a bug report

1. Click **Report a bug**
2. Fill in the title, description, and steps to reproduce
3. Set a priority, pick an assignee, add tags, attach screenshots or logs
4. Submit

### Managing bugs

- **Filter** — narrow by status, priority, assignee, or tag; the URL updates so you can bookmark or share the view
- **Update** — change status, priority, assignee, or tags straight from the bug's sidebar
- **Bulk edit** — tick several rows and use the action bar that appears
- **Comment** — add context, repro notes, or a fix plan
- **Export** — download the filtered list as CSV or JSON

## Configuration

Each workspace owns its own env file. Only the `.env.example` templates are committed.

### `server/.env`

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `5000` | API port |
| `NODE_ENV` | `development` | Set to `production` to require a real `JWT_SECRET` |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/bugtracker` | Database connection |
| `JWT_SECRET` | — | Signing key; must be set in production |
| `JWT_EXPIRES_IN` | `7d` | Token lifetime |
| `CLIENT_ORIGIN` | `http://localhost:5173` | Allowed CORS origin |
| `MAX_UPLOAD_MB` | `10` | Per-file attachment limit |

### `client/.env`

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_API_TARGET` | `http://localhost:5000` | Where the dev server proxies `/api` and `/uploads` |
| `VITE_PORT` | `5173` | Vite dev server port — keep in sync with `CLIENT_ORIGIN` |

## Use Cases

- **Software Development Teams**: Track bugs during development cycles
- **QA Teams**: Report and manage test findings
- **Product Managers**: Prioritize issues based on user impact
- **Support Teams**: Convert customer-reported issues into trackable bugs
- **Open Source Projects**: Manage community-reported bugs and feature requests

## Contributing

Contributions are welcome. Please open a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Authors

- **Avishkar Kakde**

## Acknowledgments

- Inspired by the need for better bug tracking in software development
- Built with the goal of improving team productivity and software quality

---