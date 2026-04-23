// AgentBrowser - WebSocket Mini-Service
// Broadcasts real-time session updates, streams screenshots, and action events

import { createServer } from 'http';
import { Server } from 'socket.io';

const httpServer = createServer();

const io = new Server(httpServer, {
  path: '/',
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// ─── Connection Handling ───────────────────────────────────────────

interface ClientInfo {
  socketId: string;
  sessionId: string | null; // subscribed session room
  joinedAt: Date;
}

const clients = new Map<string, ClientInfo>();

io.on('connection', (socket) => {
  console.log(`[BrowserWS] Client connected: ${socket.id}`);

  const clientInfo: ClientInfo = {
    socketId: socket.id,
    sessionId: null,
    joinedAt: new Date(),
  };
  clients.set(socket.id, clientInfo);

  // Send welcome message
  socket.emit('connected', {
    socketId: socket.id,
    timestamp: new Date().toISOString(),
    message: 'Connected to AgentBrowser WebSocket',
  });

  // ─── Subscribe to a session room ────────────────────────────
  socket.on('subscribe', (data: { sessionId: string }) => {
    const { sessionId } = data;
    if (!sessionId) {
      socket.emit('error', { message: 'sessionId is required' });
      return;
    }

    // Leave previous room if any
    if (clientInfo.sessionId) {
      socket.leave(clientInfo.sessionId);
      console.log(`[BrowserWS] ${socket.id} left room: ${clientInfo.sessionId}`);
    }

    socket.join(sessionId);
    clientInfo.sessionId = sessionId;
    console.log(`[BrowserWS] ${socket.id} joined room: ${sessionId}`);

    socket.emit('subscribed', {
      sessionId,
      timestamp: new Date().toISOString(),
    });
  });

  // ─── Unsubscribe from session room ──────────────────────────
  socket.on('unsubscribe', () => {
    if (clientInfo.sessionId) {
      socket.leave(clientInfo.sessionId);
      console.log(`[BrowserWS] ${socket.id} left room: ${clientInfo.sessionId}`);
      clientInfo.sessionId = null;
      socket.emit('unsubscribed', { timestamp: new Date().toISOString() });
    }
  });

  // ─── Request screenshot stream ──────────────────────────────
  socket.on('request_screenshot', async (data: { sessionId: string; interval?: number }) => {
    const { sessionId, interval } = data;
    if (!sessionId) {
      socket.emit('error', { message: 'sessionId is required' });
      return;
    }

    // Join room if not already
    if (clientInfo.sessionId !== sessionId) {
      if (clientInfo.sessionId) socket.leave(clientInfo.sessionId);
      socket.join(sessionId);
      clientInfo.sessionId = sessionId;
    }

    console.log(`[BrowserWS] ${socket.id} requested screenshot stream for ${sessionId}`);

    // Acknowledge request - the main app will handle streaming
    socket.emit('screenshot_stream_started', {
      sessionId,
      interval: interval || 2000,
      timestamp: new Date().toISOString(),
    });
  });

  // ─── Execute action via WebSocket ───────────────────────────
  socket.on('execute_action', (data: { sessionId: string; action: string; target?: string; value?: string; options?: object }) => {
    const { sessionId, action } = data;
    if (!sessionId || !action) {
      socket.emit('error', { message: 'sessionId and action are required' });
      return;
    }

    // Forward to room - any listening handler will process this
    io.to(sessionId).emit('action_request', {
      ...data,
      requestedBy: socket.id,
      timestamp: new Date().toISOString(),
    });
  });

  // ─── Heartbeat ──────────────────────────────────────────────
  socket.on('ping', () => {
    socket.emit('pong', { timestamp: new Date().toISOString() });
  });

  // ─── Disconnect ─────────────────────────────────────────────
  socket.on('disconnect', () => {
    clients.delete(socket.id);
    console.log(`[BrowserWS] Client disconnected: ${socket.id}. Active clients: ${clients.size}`);
  });

  socket.on('error', (error) => {
    console.error(`[BrowserWS] Socket error (${socket.id}):`, error);
  });
});

// ─── Broadcast Functions (called from main app via HTTP or direct) ──

// These can be triggered by making HTTP requests to this service,
// or by importing and calling directly in a shared process

export function broadcastToSession(sessionId: string, event: string, data: unknown) {
  io.to(sessionId).emit(event, { ...data, timestamp: new Date().toISOString() });
}

export function broadcastToAll(event: string, data: unknown) {
  io.emit(event, { ...data, timestamp: new Date().toISOString() });
}

export function getActiveClients(): { total: number; sessions: string[] } {
  const sessions = new Set<string>();
  for (const client of clients.values()) {
    if (client.sessionId) sessions.add(client.sessionId);
  }
  return { total: clients.size, sessions: Array.from(sessions) };
}

// ─── Start Server ──────────────────────────────────────────────────

const PORT = 3005;
httpServer.listen(PORT, () => {
  console.log(`[BrowserWS] WebSocket server running on port ${PORT}`);
});

// ─── Graceful Shutdown ─────────────────────────────────────────────

const shutdown = () => {
  console.log('[BrowserWS] Shutting down...');
  io.close();
  httpServer.close(() => {
    console.log('[BrowserWS] Server closed');
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
