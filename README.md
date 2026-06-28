# 🏆 World Cup Prediction Portal

A full-stack, containerized web application designed for predicting football match results for the World Cup. This application is built using a modern, reactive stack: an **Angular 22** frontend powered by **Tailwind CSS v4** and **Signals**, a scalable **NestJS 11** backend API, and a robust **PostgreSQL 18** database.

---

## 🏗️ Architecture Overview

The application is structured as a multi-container Docker application to ensure isolated development environments and seamless deployment.

```mermaid
graph TD
    subgraph Client Space
        Browser[User Web Browser]
    end

    subgraph Docker Virtual Network: wc-network
        direction TB
        App[wc_app: Angular 22 + Tailwind v4<br/>Port 4200]
        API[wc_api: NestJS 11 + Express<br/>Port 3000]
        DB[(wc_db: PostgreSQL 18.4<br/>Port 5432)]
        Adminer[wc_adminer: Database Admin<br/>Port 8080]
    end

    Browser -->|Port 4200| App
    Browser -->|Port 8080| Adminer
    App -->|HTTP requests /api| API
    API -->|TypeORM / pg client| DB
    Adminer -->|DB Admin UI| DB
```

---

## 💻 Tech Stack & Port Mappings

| Service | Container Name | Port (Host:Container) | Service Type / Tech Stack | Access URL / Details |
| :--- | :--- | :--- | :--- | :--- |
| **Frontend App** | `wc_app` | `4200:4200` | Angular 22, Tailwind CSS v4, Signals, Reactive Forms, jsPDF, RxJS | [http://localhost:4200](http://localhost:4200) |
| **Backend API** | `wc_api` | `3000:3000` | NestJS 11, TypeScript 5.7, TypeORM, Passport JWT, Nodemailer | [http://localhost:3000](http://localhost:3000) (Proxied via `/api`) |
| **Database** | `wc_db` | `5432:5432` | PostgreSQL 18.4 (Alpine-based) | `localhost:5432` (db_data volume mapped) |
| **Database Admin** | `wc_adminer` | `8080:8080` | Adminer 5.4.2 (Database UI Management) | [http://localhost:8080](http://localhost:8080) (Default server: `db`) |

---

## 🌟 Core Application Features

### 1. 📊 Interactive Dashboard & Live Standings
*   **Individual Leaderboard:** Displays employee standings ranked by:
    1. Total points (descending)
    2. Number of exact scoreline matches predicted (descending)
    3. Correct goal scorers predicted (descending)
    4. Correct match outcomes predicted (descending)
    5. Correct knockout resolution times predicted (descending)
    6. Display Name (alphabetical ascending)
*   **Live Rank Tracking:** Tracks standings changes with a `previousRank` snapshot mechanism to display visual indicators showing if a user has climbed, fallen, or maintained their rank.
*   **Color Team Standings:** Aggregates individual scores for the corporate teams (**Red, Yellow, Purple, Blue**), showing headcount, cumulative points, and rankings.
*   **Interactive Carousel:** Displays the next set of upcoming fixtures on a swipe-enabled/navigable card carousel (mobile-touch compatible).

### 2. ⚽ Advanced Prediction & Scoring Rules
*   **Time-Lock Enforcement:** Predictions for any fixture are strictly locked once the match's kickoff time (in UTC/IST) is reached.
*   **Knockout Mode Handling:** For knockout stages, users must predict scorelines and resolution details. If predicting a draw, they are required to specify a shootout winner.
*   **Quick Auto-Fill:** Generates mock predictions for all unpredicted upcoming matches with typical football score configurations, randomly chosen goalscorers, and resolution configurations to ease testing.
*   **Validation Safeguards:** Enforces completed predictions (requires both scores and a scorer selection). Shakes card and highlights input areas if users attempt to submit incomplete predictions.
*   **PDF Predictions Export:** Downloads a premium-themed PDF report of all submitted predictions for a started/locked match, using `jsPDF` (with standard font configurations to eliminate emoji rendering errors).

### 3. 🎯 Multi-tiered Scoring System
Points are calculated dynamically upon admin validation of actual scores and scorers:

*   **Group Stage Matches:**
    *   **Exact Score (+30 pts):** Matches the exact scoreline (e.g., predicted `2 - 1` and final score is `2 - 1`).
    *   **Correct Result (+10 pts):** Predicts the correct outcome (Home Win, Away Win, or Draw) but incorrect scoreline (e.g., predicted `1 - 0` and final score is `2 - 1`).
    *   **Goal Scorer Check (+10 pts):** Predicts the correct goalscorer (or predicts "No Goal Scorers" for a `0 - 0` goalless draw).
*   **Knockout Stage Matches:**
    *   **Exact Score (+30 pts):** Matches the exact scoreline AND matches the exact winner (for draws ending in shootouts).
    *   **Correct Winner (+10 pts):** Predicts the correct overall team that advances (regardless of regular/extra time or shootout result).
    *   **Resolution Time (+10 pts):** Predicts the correct timing format of the result (`Normal Time`, `Extra Time`, or `Penalty Shootout`).
    *   **Goal Scorer Check (+10 pts):** Predicts correct scorer (or "No Goal Scorers" for `0 - 0` draws). Note: Goals scored during a penalty shootout do not count.
    *   **Penalty Shootout Rule:** Shootouts are strictly a tie-breaker. Shootout goals and goal scorers are not counted in the final scoreline or official goal scorer lists.

---

## 🔑 Custom Authentication Flow

The application implements a secure authentication flow designed for seamless local configurations and deployment environments:

```text
User enters Email ➔ Email exists in DB?
                     ├── YES ➔ Password configured?
                     │           ├── YES ➔ Normal Password Login ➔ JWT Token issued
                     │           └── NO  ➔ First-time Setup Link generated ➔ Emailed/Logged
                     └── NO  ➔ Reject access ("Email not registered")
```

1.  **Step 1: Check Email:** Users enter their email at the login screen.
2.  **Step 2A: First-Time Login:**
    *   If a password is not set yet, the server generates a secure `setPasswordToken`.
    *   **Development Fallback:** In development mode (`NODE_ENV=development`), the link is logged to the console and appended to a local log file: [api/sent-emails.txt](file:///d:/Code/worldcup/api/sent-emails.txt).
    *   **Production:** Direct SMTP emails are dispatched to the user using Nodemailer.
    *   Users follow the link, set their password, and redirect to login.
3.  **Step 2B: Normal Login:**
    *   Users supply their password.
    *   Password verification uses a SHA-256 hash.
    *   A JWT Access Token (1-hour validity) and an encrypted, rotated Refresh Token (30-day validity) are generated.
    *   If an old Refresh Token is reused, the session is immediately revoked (Token Reuse Detection).

---

## ⚙️ Administration Portal

Users with the `admin` role can access the **Admin Panel** to manage tournament datasets:
*   **Manage Teams:** CRUD operations for team profiles, group allocations, and FIFA world rankings.
*   **Manage Fixtures:** CRUD operations for fixtures, kickoff datetimes, stage categories (Group or Knockout), and staging placeholders.
*   **Fixture Scoring:** Enter scores, multiselect actual match goalscorers, set knockout winners, and resolution times.
*   **Standings Refresh:** Submitting a fixture score updates the match status to `completed` and triggers a transaction-safe leaderboard recalculation to prevent standings drift.

---

## 🚀 Getting Started

### Method A: Spin Up Containers (Recommended)

1.  Create a `.env` configuration file in the `api/` directory (you can duplicate the provided `.env.example`).
2.  Run the following docker command at the root of the workspace:
    ```bash
    docker compose up --build
    ```
3.  All services will start up. Wait for the database schema to sync.

### Method B: Local Development (Manual Services Startup)

#### 1. Setup the Database
Ensure PostgreSQL 18 is running on port `5432`. Create a database named `wc_db`.

#### 2. Run the Backend API (NestJS)
Navigate to the `api` folder, install dependencies, configure environment, and boot:
```bash
cd api
npm install
cp .env.example .env
# Set SEED_DB=true in your .env to seed teams, fixtures, and players on boot
npm run start:dev
```

#### 3. Run the Frontend App (Angular)
Navigate to the `app` folder, install dependencies, and boot:
```bash
cd app
npm install
npm start
```
Open [http://localhost:4200](http://localhost:4200) in your browser.

---

## 👥 Seed Credentials & Test Accounts

On application startup, if `SEED_DB` is enabled (`true`), the database is populated with the complete team groups, match schedules, player rosters (sorted by positions), and test accounts.

### 🛡️ Pre-seeded Administrative User
*   **Email:** `admin@worldcup.com`
*   **Password:** `Admin@WorldCup2026`

### 👤 Pre-seeded Regular Users
*   **Email:** `user1@worldcup.com` (First-time user. Enter email, retrieve password-setup link from `api/sent-emails.txt` to set password).
*   **Email:** `user2@worldcup.com` (Activated user. Password: `user123`, Team: `Red`).
*   **Email:** `user3@worldcup.com` (Activated user. Password: `user123`, Team: `Yellow`).
*   **Email:** `user4@worldcup.com` (Activated user. Password: `user123`, Team: `Blue`).

---

## 📂 Project Structure

```text
worldcup/
├── api/                       # NestJS 11 Backend API Source Code
│   ├── src/               
│   │   ├── admin/             # Team & Fixture CRUD and Score completion logic
│   │   ├── auth/              # JWT, refresh sessions, and email auth flows
│   │   ├── db/                # Complete pre-seed database scripts (teams, matches, players)
│   │   ├── mail/              # SMTP configuration / local mock log writer
│   │   ├── matches/           # Matches data models and schemas
│   │   ├── players/           # Players data models (mapped to teams)
│   │   ├── predictions/       # Leaderboard calculations & prediction endpoints
│   │   ├── teams/             # Teams data models and schemas
│   │   └── users/             # User profiles, standings, and color teams definitions
│   ├── .env.example           # Backend config blueprint
│   └── sent-emails.txt        # Local file logging setup links in development
│
├── app/                       # Angular 22 Frontend Source Code
│   ├── src/               
│   │   ├── app/           
│   │   │   ├── auth/          # Authentication guards, tokens interceptor, predictor service
│   │   │   └── components/    # Angular components (UI Views)
│   │   │       ├── admin-panel# Admin fixture scoring and teams configuration view
│   │   │       ├── dashboard  # Standings leaderboard, teams, and next matches carousel
│   │   │       ├── leaderboard# Paginated, filterable standings list
│   │   │       ├── login      # Email entry and authentication screen
│   │   │       ├── predictor  # Matches schedule prediction and rules view
│   │   │       ├── set-password# First-time password setup screen
│   │   │       ├── terms      # Contest guidelines view
│   │   │       └── topbar     # Core site header and logout controller
│   │   └── styles.css         # Styles definitions (Tailwind v4 imports)
│   └── proxy.conf.js          # Port proxy settings mapping local vs docker hosts
│
├── Dockerfile                 # Root production build file
├── docker-compose.yml         # Dev cluster orchestrator configuration
├── fixtures.json              # Matches raw data
└── worldcup-10-06.sql         # SQL Database Snapshot
```
