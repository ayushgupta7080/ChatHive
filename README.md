# ChatHive – Mini Team Chat Application

ChatHive is a mini Slack-like team chat application built as a full-stack assignment for DeeRef Labs.  
It supports real-time messaging in channels, user presence, message history with pagination, and basic collaboration features.

---

## 1. Features

### Core Requirements

- **User Accounts**
  - Users can register and log in with a username + password.
  - Logged-in state is persisted using `localStorage` so users stay logged in across page refreshes (on the same browser/device).

- **Channels**
  - View all existing channels in the sidebar.
  - Create new channels.
  - Join channels by selecting them from the list.
  - Leave the current channel using a “Leave Channel” button.
  - Shows channel information:
    - Channel name in the header
    - Live member count for the current channel

- **Real-Time Messaging**
  - Messages appear instantly to all users in the same channel via **WebSockets (Socket.io)**.
  - Every message is stored in **MongoDB**.
  - Each message includes:
    - Sender (user)
    - Channel
    - Text content
    - Timestamp

- **Online Status (Presence)**
  - Shows a list of **online users** in the right panel.
  - Presence works across multiple browser tabs and users using Socket.io.
  - Online users list updates in real-time as users connect/disconnect.

- **Message History & Pagination**
  - Recent messages for a channel are loaded when the channel is opened.
  - “**Load older messages**” button fetches older messages from the database without loading everything at once.

- **Frontend Interface**
  - Clean, dark-themed 3-column layout:
    - Left: Channel list + channel creation
    - Center: Chat header, messages, typing indicator, input box
    - Right: Online users
  - Supports:
    - Viewing channel list
    - Entering channels
    - Viewing chat history
    - Sending messages
    - Seeing who is online

---

## 2. Optional Features Implemented

From the optional list, the following are implemented:

- ✅ **Typing indicators**  
  - Shows “`<username> is typing...`” when another user is typing in the same channel.
- ✅ **Channel members count**  
  - Shows live member count for the current channel based on active users.
- ✅ **Leave channel**
  - Users can explicitly leave the current channel via a button.


## 3. Tech Stack

**Frontend**

- HTML  
- CSS (custom styling, dark theme)  
- Vanilla JavaScript (no frontend framework)

**Backend**

- Node.js  
- Express.js  
- Socket.io (real-time communication)  

**Database**

- MongoDB (MongoDB Atlas)  
- Mongoose (ODM for MongoDB)

**Other**

- `localStorage` for maintaining logged-in user between refreshes  
- Environment variables for database configuration (`MONGODB_URI`)

---

## 4. Project Structure (Simplified)

```text
/
├── index.js          # Main Express + Socket.io server
├── package.json      # Dependencies and scripts
├── public/
│   ├── index.html    # Frontend UI
│   ├── styles.css    # Styling
│   └── main.js       # Frontend logic (auth, channels, messaging, presence)
└── README.md         # Project documentation






## 5. Setup & Run Instructions
5.1. Prerequisites

Node.js (v18+ recommended)

MongoDB database (e.g., MongoDB Atlas connection string)

5.2. Environment Variables

Create a .env file in the project root (or configure env vars on the hosting platform) with:

MONGODB_URI=your-mongodb-connection-string
PORT=5000


On platforms like Render/Replit, set these in the Environment / Secrets panel instead of .env.

5.3. Local Setup
# 1. Clone the repository
git clone https://github.com/<your-username>/chathive.git
cd chathive

# 2. Install dependencies
npm install

# 3. Run the app
npm start


The server will start on:

http://localhost:5000 (or the port configured in PORT)

Open that URL in the browser to use ChatHive.

5.4. Running in Replit / Cloud IDE

Import the repository into Replit (or use “Clone from GitHub”).

Configure the secrets / env vars:

MONGODB_URI

PORT (optional – defaults to 5000 if not set)

Ensure the Run command is:

//npm start


Click Run and open the web preview.



6. Usage Guide (What to Show in the Demo Video)
6.1. Demo Flow


Sign Up and Log In


Register a new user.


Auto-login occurs after registration.


Open another browser/incognito window and log in as another user.




Create / Join Channels


Create a new channel from the left sidebar.


Click on the channel to join it in both browser windows.


Observe the channel member count in the header.




Real-Time Messaging


Send messages between the two browser windows.


Show that messages appear instantly in both.


Show message timestamps and usernames.




Online / Offline Indicators


Show the “Online users” list updating when:


A user logs in / logs out


A tab closes






Pagination


Send multiple messages in a channel.


Scroll up and click “Load older messages”.


Older messages are fetched from the database.




Leave Channel


Click the “Leave Channel” button.


Show that:


The member count is updated.


The user is no longer active in that channel.







7. Assumptions & Limitations


Authentication


Simple username/password-based auth without JWT or OAuth.


No password reset, email verification, or roles.




Sessions


Logged-in state is stored client-side using localStorage.


Logging in on another device/browser requires credentials again.




Channel Membership


Channel member count is based on currently connected users (via Socket.io), not permanent membership stored in the database.


Channel membership data is not persisted across server restarts.




Security


No rate limiting / brute-force protection.


Designed as an assignment/MVP, not production hardened.




Optional features not included


No message edit/delete UI.


No message search.


No private/locked channels.





8. Design Decisions & Tradeoffs (for video explanation)


Chose vanilla JS + HTML/CSS for the frontend to keep the stack simple and focus on real-time logic and backend.


Used Socket.io for reliable WebSocket communication and built-in room support (channels).


Used MongoDB + Mongoose to store users, channels, and messages in a flexible schema.


Presence and channel members are tracked in-memory on the server for simplicity and performance, which is sufficient for this assignment-level app.


Persistence of auth is handled on the frontend via localStorage instead of full session/JWT setup to keep the implementation lean and easy to demo.



9. How to Extend (Future Improvements)
If continued further, these features can be added:


Private/locked channels with access control.


Message editing & soft deletion (with “edited” indicators).


Full-text search for messages.


Per-channel member list UI and persistent memberships.


JWT-based auth and refresh tokens for better security.



You can tweak the wording slightly if you want, but this is already safe, honest, and assignment-focused.

---
