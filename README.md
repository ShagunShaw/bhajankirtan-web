# BhajanKirtan — Devotional Event & Artist Booking Platform

[![Node.js](https://img.shields.io/badge/Node.js-v20+-68a063?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-5.x-black?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Cloudinary](https://img.shields.io/badge/Cloudinary-Media_CDN-3448C5?style=for-the-badge&logo=cloudinary&logoColor=white)](https://cloudinary.com/)
[![EJS](https://img.shields.io/badge/EJS-Server_Rendered-B4CA65?style=for-the-badge&logo=ejs&logoColor=white)](https://ejs.co/)
[![Docker](https://img.shields.io/badge/Docker-Containerized-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)

> A full-stack, enterprise-grade devotional event and artist management system. It powers seamless customer bookings for Jagratas, Mata Ki Chowkis, Satsangs, Sundarkand Paths, and Rudra Abhisheks while giving administrators a control cockpit for multi-artist allotment, real-time schedule conflict prevention, seasonal dynamic peak pricing, media lifecycle management on Cloudinary, and automated data retention.

---

## 📑 Table of Contents

- [Architectural Overview & Core Mechanics](#-architectural-overview--core-mechanics)
- [Key Features](#-key-features)
- [System Architecture & Data Flow](#-system-architecture--data-flow)
- [Technology Stack](#-technology-stack)
- [Database Models & Schemas](#-database-models--schemas)
- [Complete API & Route Reference](#-complete-api--route-reference)
  - [Public Customer API (`/api/default`)](#1-public-customer-api-apidefault)
  - [Admin Authentication & Metrics (`/api/admin`)](#2-admin-authentication--metrics-apiadmin)
  - [Booking Lifecycle & Conflict Engine (`/api/booking`)](#3-booking-lifecycle--conflict-engine-apibooking)
  - [Performer Management (`/api/performer`)](#4-performer-management-apiperformer)
  - [Package Management (`/api/package`)](#5-package-management-apipackage)
  - [Dynamic & Peak Pricing (`/api/price`)](#6-dynamic--peak-pricing-apiprice)
  - [Server-Rendered Views (`/`)](#7-server-rendered-views-pagesrouter)
- [Cloudinary Media & Tag Synchronization Engine](#-cloudinary-media--tag-synchronization-engine)
- [Conflict Detection Engine](#-conflict-detection-engine)
- [Automated Retention & Cleanup Engine (Cron)](#-automated-retention--cleanup-engine-cron)
- [Security & Production Hardening](#-security--production-hardening)
- [Project Directory Layout](#-project-directory-layout)
- [Getting Started & Installation](#-getting-started--installation)
- [Environment Variables](#-environment-variables)
- [License & Credits](#-license--credits)

---

## 🌟 Architectural Overview & Core Mechanics

BhajanKirtan is engineered to eliminate the manual chaos of coordinating live devotional troupes, sound systems, and solo artists.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              BhajanKirtan Architecture                       │
└─────────────────────────────────────────────────────────────────────────────┘
          │                                                  │
   [Public Client]                                    [Admin Panel]
          │ (EJS Pages / Fetch API)                          │ (SSR & JWT-Protected)
          ▼                                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Express Application Layer                          │
│  ├── Helmet (strict CSP)       ├── Morgan Logger       ├── Rate Limiting    │
│  ├── MongoDB NoSQL Sanitizer   ├── Cookie Parser       ├── Multer Parser    │
└─────────────────────────────────────────────────────────────────────────────┘
          │                                                  │
          ▼                                                  ▼
┌──────────────────────────────────┐      ┌───────────────────────────────────┐
│        Public API Gateway        │      │          Admin Gateway            │
│  • Browse Artists & Packages     │      │  • Multi-Artist Allotment Engine  │
│  • Dynamic Pricing Evaluation    │      │  • Cross-Booking Conflict Checks  │
│  • Instant Booking Submission    │      │  • Re-Allotment & Price Revision  │
│  • Zero-Login Status Tracker     │      │  • Today / Tomorrow Daily Cockpit │
└──────────────────────────────────┘      └───────────────────────────────────┘
          │                                                  │
          └────────────────────────┬─────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Service & Core Engines                            │
│  ├── Conflict Detection Engine         ├── Cloudinary Media Sync            │
│  ├── Dynamic Tag Counter Engine        ├── Midnight Retention Cron Job      │
└─────────────────────────────────────────────────────────────────────────────┘
          │                                                  │
          ▼                                                  ▼
┌──────────────────────────────────┐      ┌───────────────────────────────────┐
│         MongoDB Database         │      │          Cloudinary CDN           │
│  • Bookings, Performers, Admins  │      │  • Auto-Garbage Collection        │
│  • Packages, PeakPrices, Tags    │      │  • Streaming Optimization         │
└──────────────────────────────────┘      └───────────────────────────────────┘
```

---

## 🚀 Key Features

### 1. 🎤 Dual Booking Modes: Solo & Full Packages
- **Solo Devotional Artist**: Customers select their favorite performer (Bhajan singer, Kathavachak, Pandit ji). Admin can confirm with the requested artist or allot an alternate specialist.
- **Troupe / Package Booking**: Complete turnkey packages (sound setup, chorus, dholak, harmonium, organist, lighting). Admin manages structured team allotments per package booking.

### 2. ⚡ Real-Time Booking Conflict Detection Engine
- Automatically scans all assigned artists against upcoming confirmed bookings on that date.
- Prevents double-booking any artist across multiple events.
- Features an admin **`ignoreConflicts: true`** override for multi-shift ceremonies or shared troupe members.

### 3. 📅 Date-Driven Dynamic & Seasonal Peak Pricing
- Artists have standard base rates plus calendar-based peak price rules (e.g. Navratri, Janmashtami, Shivratri, Diwali).
- During booking creation, the platform computes prices dynamically: `Calculated Price = Base Price * Peak Multiplier`.
- Admin retains flexibility to adjust final negotiated pricing before final confirmation with full audit logging.

### 4. 🔍 Zero-Login Privacy-Preserving Status Lookup
- Customers check booking progress via **Reference ID (`BK-XXXXXXXXX`) + Registered Phone Number (Last 4 Digits verification)**.
- Masked timing attacks: Uniform 404 responses prevent attackers from probing valid booking reference IDs.

### 5. ☁️ Bidirectional Cloudinary Media Synchronization
- High-res artist portraits, gallery snapshots, and video clips uploaded via optimized `multer` disk storage.
- Auto-deletes old or replaced media on Cloudinary upon performer/package update or deletion.

### 6. 🏷️ Dynamic Tag Reference Counter
- Multi-genre tagging (e.g., *Jagrata*, *Mata ki Chowki*, *Satsang*, *Sundarkand*, *Rudra Abhishek*).
- Auto-increments counts when artists link tags; auto-decrements and purges tags when counts drop to zero.

### 7. ⏱️ Midnight Data Retention & Purge Cron
- Automatically cleans up historical completed bookings past the configured retention window (e.g. 30 days).
- Single-document `Log` tracking informs search queries: *"Bookings prior to YYYY-MM-DD have been archived as per retention policy."*

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Runtime & Framework** | Node.js (ES Modules), Express.js 5.x |
| **Database & ODM** | MongoDB, Mongoose 9.x |
| **Authentication & Tokens** | Dual-Token JWT (Access & Refresh tokens in HTTP-only cookies), `bcrypt` |
| **File Handling & CDN** | Multer 2.x, Cloudinary API v2 |
| **View Engine & Styling** | EJS (Embedded JavaScript), Modern CSS (Custom Design System, Flexbox/Grid) |
| **Security & Utilities** | Helmet (CSP), Rate Limiting, Mongo Operator Sanitizer, Morgan, Node-Cron |
| **DevOps & Containers** | Docker, Docker Compose, Nodemon |

---

## 🗄️ Database Models & Schemas

```
┌─────────────────┐       ┌─────────────────┐       ┌──────────────────┐
│   Performer     │◄──────┤    Booking      ├──────►│     Package      │
├─────────────────┤1     *├─────────────────┤*     1├──────────────────┤
│ fullName        │       │ referenceId     │       │ packageName      │
│ basePrice       │       │ customerName    │       │ price            │
│ profilePhoto    │       │ phone, email    │       │ bulletFeatures[] │
│ workPhotos[]    │       │ bookingType     │       │ workPhotos[]     │
│ workVideos[]    │       │ eventDate       │       │ workVideos[]     │
│ tags[] (Refs)   │       │ status          │       │ visibility       │
│ visibility      │       │ allotments[]    │       └──────────────────┘
└────────┬────────┘       │ quotedAmount    │
         │                │ finalAmount     │
         │*               └────────┬────────┘
         ▼1                        │1
┌─────────────────┐                │
│      Tag        │                ▼1
├─────────────────┤       ┌──────────────────┐
│ name (unique)   │       │      Log         │
│ displayName     │       ├──────────────────┤
│ count (Number)  │       │ key (unique)     │
└─────────────────┘       │ lastCleanedUp    │
                          └──────────────────┘
```

- **`Admin`**: Credentials (`bcrypt` salt 10), token rotation state (`refreshToken`), identity fields.
- **`Booking`**: Full event dossier, reference IDs, snapshot amounts, status lifecycle enums (`requested` -> `confirmed` / `rejected` -> `completed` / `cancelled`), sub-document `allotments` array with performer references and assignment states.
- **`Performer`**: Artist portfolio, base rates, media arrays, experience, and tag relationships.
- **`Package`**: Bundled devotional offerings, curated bullet highlights, media galleries, visibility toggles.
- **`PeakPrice`**: Performer-linked date ranges (`from` to `to`), label, and multiplier peak prices.
- **`Tag`**: Normalized names, display labels, and real-time usage counters.
- **`Log`**: Atomic singleton document maintaining the latest cron purge cutoff date for search transparency.

---

## 📡 Complete API & Route Reference

### 1. Public Customer API (`/api/default`)

| Method | Endpoint | Description | Auth |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/default/` | Fetch all visible performers & active tag catalog | Public |
| `GET` | `/api/default/packages` | Fetch all visible devotional packages | Public |
| `GET` | `/api/default/performer/:id`| Retrieve full artist profile, gallery, and pricing | Public |
| `GET` | `/api/default/package/:id` | Retrieve package details and inclusions | Public |
| `POST`| `/api/default/book/performer/:performerId` | Submit a solo artist booking request | Public |
| `POST`| `/api/default/book/package/:packageId` | Submit a package booking request | Public |
| `POST`| `/api/default/booking/status` | Track booking status via reference ID & phone digits | Public |

---

### 2. Admin Authentication & Metrics (`/api/admin`)

| Method | Endpoint | Description | Auth |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/admin/create-admin` | Seed initial super-admin account | Guarded |
| `POST` | `/api/admin/login` | Authenticate admin, issue access & refresh tokens | Public |
| `GET` | `/api/admin/dashboard` | Aggregated dashboard stats (Upcoming, Today/Tomorrow events)| Admin JWT |
| `POST` | `/api/admin/dashboard/markReconfirm/:bookingId` | Mark event reconfirmed after calling client | Admin JWT |
| `GET` | `/api/admin/tags` | Fetch tag registry with usage metrics | Admin JWT |
| `POST` | `/api/admin/logout` | Revoke refresh token and wipe session cookies | Admin JWT |

---

### 3. Booking Lifecycle & Conflict Engine (`/api/booking`)

| Method | Endpoint | Description | Auth |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/booking/` | Paginated booking ledger with status filters | Admin JWT |
| `GET` | `/api/booking/search` | Multi-parameter search (`fromDate`, `toDate`, `performerId`, `status`) | Admin JWT |
| `POST` | `/api/booking/confirm/:bookingId` | Confirm booking, allot artists, run clash check | Admin JWT |
| `POST` | `/api/booking/reject/:bookingId` | Reject booking request | Admin JWT |
| `POST` | `/api/booking/reallot/:bookingId` | Hot-swap an assigned artist with conflict checks | Admin JWT |
| `POST` | `/api/booking/final-amount/:bookingId` | Update negotiated final price with audit trail | Admin JWT |
| `POST` | `/api/booking/cancel/:bookingId` | Cancel booking (`cancelledBy`: customer/admin/performer) | Admin JWT |

#### 📋 Confirm Booking Payload (`POST /api/booking/confirm/:bookingId`)
```json
{
  "allotments": [
    { "performerId": "67101a01e123456789abcd01", "role": "Lead Singer" },
    { "performerId": "67101a01e123456789abcd02", "role": "Dholak Player" }
  ],
  "finalAmount": 21000,
  "reason": "Festive seasonal discount applied",
  "ignoreConflicts": false
}
```
*Note: For `solo` bookings, `allotments` is optional. Omitting it automatically assigns the requested artist.*

---

### 4. Performer Management (`/api/performer`)

| Method | Endpoint | Description | Auth |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/performer/` | List all registered performers | Admin JWT |
| `GET` | `/api/performer/:performerId` | Get detailed performer profile | Admin JWT |
| `POST` | `/api/performer/` | Create performer (Multipart: profile, work photos/videos) | Admin JWT |
| `PATCH`| `/api/performer/:performerId` | Update performer profile & sync media on Cloudinary | Admin JWT |
| `PATCH`| `/api/performer/visibility/:performerId` | Atomic toggle visibility (`visible` ⇄ `hidden`) | Admin JWT |
| `DELETE`| `/api/performer/:performerId` | Purge performer, purge Cloudinary media & decrement tags | Admin JWT |

---

### 5. Package Management (`/api/package`)

| Method | Endpoint | Description | Auth |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/package/` | List all packages (optional `?visibility=` filter) | Admin JWT |
| `GET` | `/api/package/:packageId` | Get individual package details | Admin JWT |
| `POST` | `/api/package/` | Create package with work photos & sample videos | Admin JWT |
| `PATCH`| `/api/package/:packageId` | Update package content & adjust media assets | Admin JWT |
| `PATCH`| `/api/package/visibility/:packageId` | Atomic toggle visibility (`visible` ⇄ `hidden`) | Admin JWT |
| `DELETE`| `/api/package/:packageId` | Delete package & cascade media removal from Cloudinary | Admin JWT |

---

### 6. Dynamic & Peak Pricing (`/api/price`)

| Method | Endpoint | Description | Auth |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/price/` | Fetch pricing matrix across all performers & dates | Admin JWT |
| `PATCH`| `/api/price/basePrice/:performerId` | Update base non-peak performance fee | Admin JWT |
| `POST` | `/api/price/peakPrice` | Create new peak period window and pricing | Admin JWT |
| `PATCH`| `/api/price/peakPrice/:id` | Modify dates, labels, or rates for peak window | Admin JWT |
| `DELETE`| `/api/price/peakPrice/:id` | Remove peak price rule | Admin JWT |

---

### 7. Server-Rendered Views (`pages.route.js`)

| Route | View Template | Description |
| :--- | :--- | :--- |
| `/` | `public/home` | Landing page, featured artists & packages |
| `/search` | `public/performers` | Live artist filtering by date, tag, and rate |
| `/performers/:id`| `public/performer-detail` | Artist portfolio, YouTube links, booking CTA |
| `/packages/:id` | `public/package-detail` | Package inclusions, gallery, booking CTA |
| `/book/performer`| `public/booking-performer` | Solo booking form |
| `/book/package` | `public/booking-package` | Package booking form |
| `/booking-status`| `public/booking-status` | Zero-login booking progress tracker |
| `/admin/login` | `public/admin-login` | Admin authentication portal |
| `/admin/dashboard`| `admin/dashboard` | Admin mission control: Today/Tomorrow queues |
| `/admin/bookings`| `admin/bookings` | Booking management & filter interface |
| `/admin/performers`| `admin/performers` | Artist table, visibility switches & edit forms |
| `/admin/packages` | `admin/packages` | Package builder and manager |
| `/admin/pricing` | `admin/pricing` | Peak dates & seasonal rate manager |

---

## ⚡ Conflict Detection Engine

The conflict engine in [`booking.service.js`](file:///d:/Development%20Docs%202/BhajanKirtan/src/services/booking.service.js) guarantees zero scheduling overlaps:

```
[Confirm/Re-Allot Requested]
            │
            ▼
    [Extract Performer IDs]
            │
            ▼
  [Query other Confirmed Bookings on same EventDate]
            │
   ┌────────┴────────┐
   ▼                 ▼
[Clash Found?]    [No Clash]
   │                 │
   ├─► ignoreConflicts === true? ──► [Allow Booking & Save]
   │        │ (No)
   │        ▼
   └─► [Throw 409 Conflict Error with clash details]
```

---

## 🧹 Automated Retention & Cleanup Engine (Cron)

A scheduled background cron job powered by `node-cron` runs every midnight (`0 0 * * *`) in [`bookingCleanup.cron.js`](file:///d:/Development%20Docs%202/BhajanKirtan/src/utils/bookingCleanup.cron.js):

1. Calculates cutoff date: `cutoffDate = Today - RETENTION_DAYS` (e.g. 30 days).
2. Deletes historical bookings matching `{ status: "completed", eventDate: { $lt: cutoffDate } }`.
3. Upserts the singleton [`Log`](file:///d:/Development%20Docs%202/BhajanKirtan/src/models/log.model.js) model:
   ```javascript
   await Log.findOneAndUpdate(
       { key: "booking_cleanup" },
       { $set: { lastCleanedUpBeforeDate: cutoffDate } },
       { upsert: true }
   );
   ```
4. When admins search past dates with zero results, the system verifies `queriedDate < cutoffDate` and returns:
   > *"Bookings before YYYY-MM-DD have been removed from the database as per data retention policy."*

---

## 🔒 Security & Production Hardening

- **Strict Content Security Policy (CSP)**: Handled via `helmet` to authorize Google Fonts, Cloudinary CDN media, and YouTube embedded performances while blocking XSS vectors.
- **Dual-Token Authentication**: Short-lived Access Tokens (15m) + secure Refresh Tokens (7d) transmitted in `HttpOnly`, `SameSite: Strict` cookies.
- **MongoDB Injection Prevention**: Middleware recursively strips keys starting with `$` from all incoming requests.
- **Graceful Shutdown**: Intercepts `SIGINT` and `SIGTERM` signals to allow inflight requests to complete before cleanly closing database connections.
- **Rate Limiting**: Protects sensitive lookup endpoints from brute-force enumeration attacks.

---

## 📂 Project Directory Layout

```text
BhajanKirtan/
├── public/                     # Static assets served at root
│   ├── css/                    # Modular stylesheets (dashboard, booking, base)
│   ├── js/                     # Client-side scripts (admin modals, booking tracking)
│   └── temp/                   # Multer temporary buffer
├── src/
│   ├── server.js               # Application bootstrap & DB connection
│   ├── app.js                  # Express middleware configuration & route mounting
│   ├── controllers/            # Controller layer
│   ├── middlewares/            # JWT verification & Multer media configurations
│   ├── models/                 # Mongoose schemas (Booking, Performer, Package, etc.)
│   ├── routes/                 # Express API & SSR page routes
│   ├── services/               # Business logic, conflict checks & Cloudinary sync
│   ├── utils/                  # apiResponse, apiError, dates, cron cleanup, Cloudinary
│   └── views/                  # EJS templates (admin, public, shared partials)
├── docker-compose.yml          # Containerized deployment configuration
├── package.json
└── pnpm-lock.yaml
```

---

## 🏁 Getting Started & Installation

### Prerequisites
- [Node.js (v20+ recommended)](https://nodejs.org/)
- [pnpm](https://pnpm.io/) (or `npm`)
- [MongoDB (v6.0+)](https://www.mongodb.com/) running locally or on MongoDB Atlas
- [Cloudinary Account](https://cloudinary.com/) for media storage

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/your-username/BhajanKirtan.git
cd BhajanKirtan
pnpm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` and fill in your credentials:
```bash
cp .env.example .env
```

### 3. Launch Development Server
```bash
pnpm dev
```
The application will be live at: **`http://localhost:3000`**

### 4. Running with Docker Compose
```bash
docker-compose up --build
```

---

## ⚙️ Environment Variables

| Variable | Description | Example |
| :--- | :--- | :--- |
| `PORT` | Web server port | `3000` |
| `NODE_ENV` | Runtime environment | `development` or `production` |
| `MONGODB_URI` | MongoDB connection connection string | `mongodb://localhost:27017/bhajankirtan` |
| `WEB_ROUTE` | Base URL of your backend API | `http://localhost:3000/api/` |
| `ACCESS_TOKEN_SECRET` | Secret key for signing Access Tokens | `your_access_token_secret` |
| `ACCESS_TOKEN_EXPIRY` | Access token lifespan | `15m` |
| `REFRESH_TOKEN_SECRET`| Secret key for signing Refresh Tokens | `your_refresh_token_secret` |
| `REFRESH_TOKEN_EXPIRY`| Refresh token lifespan | `7d` |
| `ADMIN_AUTH_CHECK_PATH`| Route path for validating admin JWT session | `/check-JWT` |
| `CLOUDINARY_CLOUD_NAME`| Cloudinary cloud name | `your_cloud_name` |
| `CLOUDINARY_API_KEY` | Cloudinary API Key | `your_api_key` |
| `CLOUDINARY_API_SECRET`| Cloudinary API Secret | `your_api_secret` |

---

## 📄 License & Credits

Developed with devotion by **Shagun Shaw**.  
Licensed under the [ISC License](LICENSE).

