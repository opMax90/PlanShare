# PlanShare

A secure, real-time collaborative meeting platform where authenticated users create or join rooms to draw, chat, and collaborate with role-based permissions.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React.js + Vite |
| Backend | Node.js + Express |
| Database | MongoDB + Mongoose |
| Real-Time | Socket.IO |
| Auth | JWT + bcrypt |

## Features

- **Authentication** – Register/login with JWT in HTTP-only cookies
- **Room System** – Create/join rooms with unique 6-character codes
- **Collaborative Canvas** – Real-time drawing with color picker, brush size, eraser
- **Live Chat** – Instant messaging with XSS prevention and rate limiting
- **Leader Controls** – Grant/revoke draw, mute, kick, transfer leadership, lock canvas/room
- **Game Mode** – Optional word-guessing game with timer and scoreboard
- **Dark/Light Theme** – Toggle with localStorage persistence
- **RBAC** – Server-side permission validation for all actions

## Environment Variables

Create `server/.env`:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/planshare
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRE=7d
NODE_ENV=development
CLIENT_URL=http://localhost:5173
```

## Local Setup

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)

### Install & Run

```bash
# Backend
cd server
npm install
npm run dev

# Frontend (new terminal)
cd client
npm install
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:5000

## Folder Structure

```
/server
  /controllers    # Route handlers
  /models         # Mongoose schemas
  /routes         # Express routes
  /middleware      # Auth & validation
  /sockets        # Socket.IO handlers
  /utils          # Helpers
  server.js       # Entry point

/client
  /src
    /components   # Reusable UI components
    /pages        # Route pages
    /context      # React Context providers
    /services     # API client
    /styles       # CSS modules
  App.jsx         # Router & providers
```

## Deployment

### Backend (Render / Railway)

1. Push `server/` to a Git repository
2. Create a new Web Service on Render or Railway
3. Set environment variables:
   - `MONGO_URI` – MongoDB Atlas connection string
   - `JWT_SECRET` – Strong random secret
   - `NODE_ENV` – `production`
   - `CLIENT_URL` – Deployed frontend URL
4. Build command: `npm install`
5. Start command: `node server.js`

### Frontend (Vercel / Netlify)

1. Push `client/` to a Git repository
2. Create a new project on Vercel or Netlify
3. Set build command: `npm run build`
4. Set output directory: `dist`
5. Update `src/services/api.js` and `src/context/SocketContext.jsx` with the deployed backend URL
6. Add a redirect rule: `/* → /index.html` (for SPA routing)

## License

MIT
