import 'dotenv/config';
import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';

const app = express();
const server = http.createServer(app);

// Support multiple origins via CORS_ORIGIN env (comma-separated)
const rawOrigins = process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:8081';
const allowedOrigins = rawOrigins.split(',').map(s => s.trim()).filter(Boolean);

console.log('🌐 CORS Configuration:');
console.log('  - Raw Origins:', rawOrigins);
console.log('  - Allowed Origins:', allowedOrigins);

const corsOriginFn = (origin, callback) => {
  console.log(`📡 CORS request from origin: ${origin}`);
  // allow non-browser requests (Postman, curl) where origin is undefined
  if (!origin) return callback(null, true);
  
  // Check for wildcard or specific origin match
  if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
    console.log(`✅ Origin ${origin} is allowed`);
    return callback(null, true);
  }
  console.log(`❌ Origin ${origin} is NOT allowed`);
  return callback(new Error('CORS origin not allowed'), false);
};

// Socket.IO CORS — validate incoming origin
const io = new SocketIOServer(server, {
  cors: {
    origin: (origin, cb) => {
      // socket.io may pass undefined for server-side clients
      if (!origin) return cb(null, true);
      // Check for wildcard or specific origin match
      cb(null, allowedOrigins.includes('*') || allowedOrigins.includes(origin));
    },
    credentials: true
  }
});

// Configure helmet to allow images from same origin
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false
}));

// Use dynamic CORS that reflects the incoming origin when it's allowed
app.use(cors({ 
  origin: corsOriginFn, 
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan('dev'));

// Serve static uploads with CORS applied
app.use('/uploads',
  cors({ origin: corsOriginFn, credentials: true }),
  express.static('Backend/uploads', {
    setHeaders: (res, path) => {
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    }
  })
);

// Healthcheck
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Routes placeholders
import apiRouter from './routes/index.js';
app.use('/api', apiRouter);

// Socket.io basic handlers
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next();
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret');
    socket.user = { id: payload.sub, role: payload.role };
    next();
  } catch (e) { next(); }
});

// Track users in each room
const roomUsers = new Map();

io.on('connection', (socket) => {
  console.log(`🔌 User connected: ${socket.id}`);
  
  socket.on('join-room', (roomId) => { 
    socket.join(roomId); 
    console.log(`📺 User ${socket.id} joined room: ${roomId}`);
  });
  
  socket.on('join-user-room', (userId) => {
    socket.join(`user-${userId}`);
  });

  // Handle WebRTC room joining with user tracking
  socket.on('join-webrtc-room', ({ roomId, user }) => {
    console.log(`🎥 WebRTC join request - Room: ${roomId}, User: ${user.id}, Socket: ${socket.id}`);
    
    // Check if this user is already in the room (prevent duplicates)
    if (!roomUsers.has(roomId)) {
      roomUsers.set(roomId, new Map());
    }
    const usersInRoom = roomUsers.get(roomId);
    
    // Check for existing user with same ID
    const existingUser = Array.from(usersInRoom.values()).find(u => u.userId === user.id);
    if (existingUser) {
      console.log(`⚠️ User ${user.id} already in room, updating socket connection`);
      // Remove old connection and add new one
      usersInRoom.delete(existingUser.socketId);
    }
    
    socket.join(roomId);
    socket.userId = user.id;
    socket.roomId = roomId;
    
    usersInRoom.set(socket.id, { socketId: socket.id, userId: user.id, user });
    
    console.log(`📊 Room ${roomId} now has ${usersInRoom.size} users`);
    console.log(`👥 Users in room: ${Array.from(usersInRoom.values()).map(u => u.userId).join(', ')}`);
    
    // Notify room about user count and roles
    const usersList = Array.from(usersInRoom.values());
    
    if (usersInRoom.size === 1) {
      // First user - they wait
      console.log(`📱 Sending 'waiting' status to user ${user.id}`);
      socket.emit('room-status', { 
        role: 'waiting', 
        message: 'Waiting for another user to join...',
        userCount: 1
      });
    } else if (usersInRoom.size === 2) {
      // Second user joins - room is ready for WebRTC
      const [firstUser, secondUser] = usersList;
      
      console.log(`🎯 Room ready! Caller: ${firstUser.userId}, Callee: ${secondUser.userId}`);
      
      // First user becomes caller, second becomes callee
      io.to(firstUser.socketId).emit('room-status', {
        role: 'caller',
        message: 'Starting call...',
        otherUser: secondUser.user,
        userCount: 2
      });
      
      io.to(secondUser.socketId).emit('room-status', {
        role: 'callee', 
        message: 'Receiving call...',
        otherUser: firstUser.user,
        userCount: 2
      });
      
      console.log(`🎯 Room ${roomId} ready - Caller: ${firstUser.userId}, Callee: ${secondUser.userId}`);
    } else {
      // More than 2 users - not supported
      socket.emit('room-status', { 
        role: 'error',
        message: 'Room is full (max 2 users)',
        userCount: usersInRoom.size
      });
    }
  });

  socket.on('message', async ({ roomId, message }) => {
    io.to(roomId).emit('message', message);
    const Message = (await import('./models/Message.js')).default;
    const User = (await import('./models/User.js')).default;
    const sender = socket.user?.id || null;
    const [roomType, projectId] = String(roomId).split(':');
    if (roomType === 'project' && projectId && sender) {
      const senderUser = await User.findById(sender);
      const msg = await Message.create({
        roomType: 'project',
        roomId: projectId,
        sender,
        content: message
      });
      // Emit message with sender info
      io.to(roomId).emit('message-with-sender', {
        ...msg.toObject(),
        sender: senderUser ? { name: senderUser.name, avatar: senderUser.avatar } : null
      });
      io.to(roomId).emit('notification', { type: 'message', projectId });
    }
  });

  // Simple WebRTC signaling
  socket.on('join', (room) => {
    socket.join(room);
    console.log(`User ${socket.id} joined room ${room}`);
  });

  socket.on('signal', (data) => {
    console.log(`Signal ${data.type} from ${socket.id} to room ${data.room}`);
    socket.to(data.room).emit('signal', data);
  });

  socket.on('signal', (payload) => { 
    console.log(`📡 Relaying signal from ${payload.fromUserId}: ${payload.type}`);
    socket.to(payload.roomId).emit('signal', payload); // Use socket.to() instead of io.to() to exclude sender
  });

  // Simple WebRTC signaling (no room tracking)
  socket.on('webrtc-signal', (data) => {
    console.log(`📡 WebRTC signal: ${data.type} from ${data.fromUserId}`);
    socket.to(data.roomId).emit('webrtc-signal', data);
  });

  // Handle user disconnect
  socket.on('disconnect', () => {
    console.log(`🔌 User disconnected: ${socket.id}`);
    
    if (socket.roomId && roomUsers.has(socket.roomId)) {
      const usersInRoom = roomUsers.get(socket.roomId);
      usersInRoom.delete(socket.id);
      
      console.log(`📊 Room ${socket.roomId} now has ${usersInRoom.size} users`);
      
      // Notify remaining user
      if (usersInRoom.size === 1) {
        const remainingUser = Array.from(usersInRoom.values())[0];
        io.to(remainingUser.socketId).emit('room-status', {
          role: 'waiting',
          message: 'Other user disconnected. Waiting for another user...',
          userCount: 1
        });
      } else if (usersInRoom.size === 0) {
        roomUsers.delete(socket.roomId);
        console.log(`🗑️ Cleaned up empty room: ${socket.roomId}`);
      }
    }
  });
});

// Export io for use in other modules
export { io };

const PORT = process.env.PORT || 4000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/zapplance';
const REQUIRE_MONGO = process.env.REQUIRE_MONGO !== 'false';

const startServer = () => {
  server.listen(PORT, () => console.log(`API listening on :${PORT}`));
};

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    startServer();
  })
  .catch((err) => {
    console.error('Mongo connection error', err.message || err);

    if (REQUIRE_MONGO || process.env.NODE_ENV === 'production') {
      console.error('MongoDB is required in this environment. Exiting.');
      process.exit(1);
    }

    console.warn('MongoDB unavailable. Starting server without DB connection for local development.');
    console.warn('Set REQUIRE_MONGO=true or start MongoDB to enable database-backed features.');
    startServer();
  });