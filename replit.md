# Backend Node.js Server

## Overview
A clean backend-only Node.js server with Express and Socket.io for real-time communication.

## Tech Stack
- **Runtime**: Node.js
- **Framework**: Express.js
- **Real-time**: Socket.io
- **Database**: Mongoose (MongoDB ODM)
- **Security**: bcrypt for password hashing
- **Middleware**: CORS enabled

## Entry Point
The main backend server is located at `index.js` in the project root.

## Running the Server
```bash
node index.js
```

The server will start on port 5000 (or the PORT environment variable if set).

## API Endpoints

### Health Check
- `GET /` - Returns server status message
- `GET /health` - Returns health status with timestamp

## Socket.io Events
- `connection` - Fired when a client connects
- `disconnect` - Fired when a client disconnects

## MongoDB Connection
The MongoDB connection is commented out by default. To enable:
1. Set up a MongoDB database
2. Uncomment the mongoose.connect() block in index.js
3. Update the connection string with your database URL

## Environment Variables
- `PORT` - Server port (default: 5000)

## Installed Packages
- express - Web framework
- socket.io - Real-time bidirectional communication
- mongoose - MongoDB object modeling
- cors - Cross-origin resource sharing
- bcrypt - Password hashing

## Notes
The index.js file contains a clean backend setup without any frontend dependencies.
