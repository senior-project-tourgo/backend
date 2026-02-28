# TourGO Backend API

Backend service for the **TourGO** mobile application.
Provides authentication, user management, and core API endpoints for the tourism platform.

---

## Tech Stack

* **Node.js**
* **Express.js**
* **MongoDB** (Mongoose)
* **JWT Authentication**
* **dotenv** for environment variables

---

## Project Structure

```
backend/
│
├── config/         # Database and app configuration
├── controllers/    # Route logic
├── middleware/     # Auth and error handling
├── models/         # Mongoose schemas
├── routes/         # API routes
├── utils/          # Helper functions
│
├── .env            # Environment variables
├── server.js       # App entry point
└── package.json
```

---

## Installation

### 1. Clone the repository

```bash
git clone <repo-url>
cd backend
```

### 2. Install dependencies

```bash
npm install
```

### 3. Create `.env` file

Create a `.env` file in the root:

```
PORT=5001
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
```

---

## Running the Server

### Development

```bash
npm run dev
```

### Production

```bash
npm start
```

Server will run at:

```
http://localhost:5001
```

---

## API Base URL

```
http://localhost:5001/api
```

---

## Authentication Endpoints

### Register

**POST** `/api/auth/register`

**Body:**

```json
{
  "name": "Test User",
  "username": "testuser",
  "identifier": "testuser@gmail.com",
  "password": "password123"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "token": "JWT_TOKEN",
    "user": {
      "id": "user_id",
      "name": "Test User",
      "username": "testuser",
      "email": "testuser@gmail.com"
    }
  }
}
```

---

### Login

**POST** `/api/auth/login`

**Body:**

```json
{
  "identifier": "testuser@gmail.com",
  "password": "password123"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "token": "JWT_TOKEN",
    "user": {
      "id": "user_id",
      "name": "Test User",
      "username": "testuser",
      "email": "testuser@gmail.com"
    }
  }
}
```

---

## Protected Routes

Use the JWT token in headers:

```
Authorization: Bearer <token>
```

Example:

```
GET /api/user/profile
```

---

## Health Check

**GET** `/health`

Response:

```json
{
  "success": true,
  "message": "Server is running"
}
```

---

## Environment Variables

| Variable   | Description                   |
| ---------- | ----------------------------- |
| PORT       | Server port (default: 5001)   |
| MONGO_URI  | MongoDB connection string     |
| JWT_SECRET | Secret for signing JWT tokens |

---

## Scripts

From `package.json`:

```json
"scripts": {
  "start": "node server.js",
  "dev": "nodemon server.js"
}
```

---

## Future Features

* Places & activities API
* Trip planner
* Saved locations
* Leaderboard
* Personalized recommendations

---

## Author

TourGO Senior Project Backend
Built for the TourGO mobile tourism platform.


