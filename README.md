 MERN Video Chat Application

A full-stack real-time video chat application built using the MERN stack, WebRTC, and Socket.io.  
The app supports secure authentication, real-time messaging, peer-to-peer video calls, and cloud deployment.

🚀 Live Demo: https://mern-video-chat-app-wj1y.onrender.com  
(First load may take ~30 seconds on free hosting.)

---

##  Features

-  JWT-based Authentication (Register / Login)
-  Real-time Chat using Socket.io
-  One-to-One Video Calling using WebRTC
-  Online Users List
-  Busy Detection for active calls
-  Clean call termination handling
-  Responsive UI (Desktop & Mobile support)
-  Cloud Deployed on Render
-  MongoDB Atlas Database

---

##  Tech Stack

**Frontend**
- HTML, CSS (Tailwind)
- Vanilla JavaScript
- Socket.io Client
- WebRTC APIs

**Backend**
- Node.js
- Express.js
- Socket.io
- JWT Authentication
- MongoDB + Mongoose

**DevOps / Tools**
- Git & GitHub
- Render (Deployment)
- MongoDB Atlas
- dotenv

---

##  Project Structure

chat-app/
├── src/
│ ├── client/
│ │ ├── auth.html
│ │ ├── index.html
│ │ ├── chat.js
│ │ └── videocall.js
│ └── server/
│ ├── controller/
│ ├── middleware/
│ ├── models/
│ └── routes/
├── app.js
├── package.json
├── .env.example
└── README.md

##  Environment Variables

Create a `.env` file in the project root:


MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
 Running Locally
# Clone repository
git clone https://github.com/Ektaawadhwaa/mern-video-chat-app

# Install dependencies
npm install

# Start server
npm start
Open in browser:

http://localhost:3000
Authentication Flow
User registers and logs in.

Passwords are securely hashed using bcrypt.

JWT token is issued and stored on client.

Token is validated during Socket.io handshake.

User identity is attached to socket session.

 Video Call Flow
Caller sends WebRTC offer via Socket.io signaling.

Receiver accepts and sends answer.

ICE candidates exchanged in real-time.

Peer-to-peer media stream established.

Clean disconnect handling for both users.

 Future Improvements
 Persist chat history in database

 Call logs and analytics

 Refresh token mechanism

 User profile management

 Dark mode UI

 Progressive Web App (PWA)

 Contribution
Contributions and suggestions are welcome!
Feel free to fork the repository and submit pull requests.

 License
This project is for educational and portfolio purposes.
