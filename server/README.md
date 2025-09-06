# Backend Server

This directory contains the Node.js backend for the application, built with Express, TypeScript, Sequelize, and BullMQ.

## Features

- **REST API**: For managing users, libraries, and background jobs.
- **Authentication**: JWT-based authentication with root user privileges.
- **Database**: Uses PostgreSQL with Sequelize for object-relational mapping.
- **Background Jobs**: Long-running AI tasks are processed in the background using BullMQ and Redis.
- **Process Management**: Uses PM2 to manage the API server and the AI worker as separate processes.

## Getting Started

### Prerequisites

- Node.js (v18 or later)
- npm
- PostgreSQL
- Redis
- A running instance of the frontend application.

### 1. Installation

1.  **Navigate to the server directory:**
    ```bash
    cd server
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

### 2. Environment Configuration

1.  **Create a `.env` file** in the `server` directory by copying the example file:
    ```bash
    cp .env.example .env
    ```

2.  **Edit the `.env` file** and provide the necessary values for your environment:
    - `PORT`: The port for the API server (e.g., 3001).
    - `DATABASE_URL`: The connection string for your PostgreSQL database.
      - *Example: `postgres://user:password@localhost:5432/mydatabase`*
    - `REDIS_URL`: The connection string for your Redis instance.
      - *Example: `redis://localhost:6379`*
    - `JWT_SECRET`: A long, random, and secret string for signing JWTs.
    - `GEMINI_API_KEY`: Your API key for the Google Gemini service.
    - `ROOT_USER_EMAIL`: The email address of the user who should have ROOT privileges.

### 3. Database Migration

Before starting the server, you need to run the database migrations to create all the necessary tables.

```bash
# First, compile the TypeScript code
npm run build

# Then, run the migrations
npx sequelize-cli db:migrate
```

### 4. Running the Application

#### For Development

This will run the API server and the AI worker using `nodemon`, which automatically restarts on file changes.

```bash
# Terminal 1: Start the API server
npm run dev

# Terminal 2: Start the AI worker
npm run dev:worker
```

#### For Production

This will build the application and start both the API server and the AI worker using PM2, as defined in `ecosystem.config.js`.

```bash
npm run pm2:start
```

### PM2 Commands

- **Stop all processes**: `npm run pm2:stop`
- **Restart all processes**: `npm run pm2:restart`
- **View logs**: `npm run pm2:logs`
- **Delete from PM2 registry**: `npm run pm2:delete`

## API Structure Overview

All API routes are prefixed with `/api`.

-   `/api/auth`: User registration and login.
-   `/api/libraries`: CRUD operations for user libraries and files. Includes routes for managing templates (ROOT only).
-   `/api/jobs`: Creating and checking the status of background AI jobs.
