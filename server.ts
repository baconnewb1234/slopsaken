import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

const server = createServer(app);
const wss = new WebSocketServer({ server });

interface PlayerState {
  id: string;
  name: string;
  role: 'survivor' | 'hunter';
  survivorClass?: string;
  hunterClass?: string;
  isHost: boolean;
  isReady: boolean;
  health?: number;
  x?: number;
  z?: number;
  rotY?: number;
  action?: string | null;
  lastSeen?: number;
}

interface Room {
  code: string;
  hostId: string;
  mapId: string;
  maxPlayers: number;
  status: 'lobby' | 'playing' | 'ended';
  killerId?: string | null;
  killerName?: string | null;
  players: Record<string, PlayerState>;
  updatedAt: number;
}

const rooms: Record<string, Room> = {};
const socketRooms: Record<string, Set<WebSocket>> = {};

function broadcastToRoom(roomCode: string, payload: any) {
  const peers = socketRooms[roomCode];
  if (peers) {
    const raw = JSON.stringify(payload);
    peers.forEach((peer) => {
      if (peer.readyState === WebSocket.OPEN) {
        peer.send(raw);
      }
    });
  }
}

function findRoom(queryCode: string): Room | undefined {
  if (!queryCode) return undefined;
  const upper = queryCode.trim().toUpperCase();
  if (rooms[upper]) return rooms[upper];

  // Try with SLOP- prefix
  if (!upper.startsWith('SLOP-')) {
    const withPrefix = `SLOP-${upper}`;
    if (rooms[withPrefix]) return rooms[withPrefix];
  }

  // Alphanumeric match
  const alphaUpper = upper.replace(/[^A-Z0-9]/g, '');
  for (const r of Object.values(rooms)) {
    const rAlpha = r.code.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (rAlpha === alphaUpper || r.code.toUpperCase() === upper) {
      return r;
    }
  }

  return undefined;
}

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'SLOP-';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// REST Endpoints for rock-solid cross-device joining
app.post('/api/rooms/create', (req, res) => {
  const { hostName, role, survivorClass, hunterClass, mapId, maxPlayers } = req.body;
  const code = generateRoomCode();
  const hostId = `player_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const capacity = Math.max(2, Math.min(8, Number(maxPlayers) || 8));

  rooms[code] = {
    code,
    hostId,
    mapId: mapId || 'school',
    maxPlayers: capacity,
    status: 'lobby',
    killerId: null,
    killerName: null,
    players: {
      [hostId]: {
        id: hostId,
        name: hostName || 'Host Player',
        role: role || 'survivor',
        survivorClass: survivorClass || 'newb',
        hunterClass: hunterClass || 'black_slasher',
        isHost: true,
        isReady: true,
        lastSeen: Date.now(),
      },
    },
    updatedAt: Date.now(),
  };

  res.json({ success: true, room: rooms[code], playerId: hostId });
});

app.post('/api/rooms/join', (req, res) => {
  const { code, playerName, survivorClass, hunterClass } = req.body;
  const room = findRoom(code);

  if (!room) {
    return res.status(404).json({ success: false, message: 'Lobby code not found! Check code and try again.' });
  }

  const currentCount = Object.keys(room.players).length;
  const capacity = room.maxPlayers || 8;
  if (currentCount >= capacity) {
    return res.status(400).json({ success: false, message: `Lobby is full! Max ${capacity} players.` });
  }

  const playerId = `player_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  room.players[playerId] = {
    id: playerId,
    name: (playerName || `Player ${currentCount + 1}`).trim(),
    role: 'survivor',
    survivorClass: survivorClass || 'newb',
    hunterClass: hunterClass || 'black_slasher',
    isHost: false,
    isReady: true,
    lastSeen: Date.now(),
  };
  room.updatedAt = Date.now();

  // Notify WebSocket peers
  broadcastToRoom(room.code, { type: 'room_state', room });

  res.json({ success: true, room, playerId });
});

app.get('/api/rooms/:code', (req, res) => {
  const room = findRoom(req.params.code);
  if (!room) {
    return res.status(404).json({ success: false, message: 'Room not found' });
  }
  res.json({ success: true, room });
});

// Update player class / settings in lobby
app.post('/api/rooms/:code/update_player', (req, res) => {
  const room = findRoom(req.params.code);
  if (!room) {
    return res.status(404).json({ success: false, message: 'Room not found' });
  }
  const { playerId, survivorClass, name } = req.body;
  if (playerId && room.players[playerId]) {
    if (survivorClass) room.players[playerId].survivorClass = survivorClass;
    if (name) room.players[playerId].name = name;
    room.players[playerId].lastSeen = Date.now();
    room.updatedAt = Date.now();
    broadcastToRoom(room.code, { type: 'room_state', room });
  }
  res.json({ success: true, room });
});

// Start match: Randomly choose 1 Killer, others become Survivors
app.post('/api/rooms/:code/start', (req, res) => {
  const room = findRoom(req.params.code);
  if (!room) {
    return res.status(404).json({ success: false, message: 'Room not found' });
  }

  const playerList = Object.values(room.players);
  if (playerList.length === 0) {
    return res.status(400).json({ success: false, message: 'No players in room' });
  }

  // Randomly choose 1 person to be killer
  const chosenIndex = Math.floor(Math.random() * playerList.length);
  const chosenKiller = playerList[chosenIndex];

  room.killerId = chosenKiller.id;
  room.killerName = chosenKiller.name;
  room.status = 'playing';

  for (const p of playerList) {
    if (p.id === chosenKiller.id) {
      p.role = 'hunter';
    } else {
      p.role = 'survivor';
    }
  }
  room.updatedAt = Date.now();

  broadcastToRoom(room.code, {
    type: 'match_started',
    room,
    killerId: room.killerId,
    killerName: room.killerName,
    mapId: room.mapId,
  });

  res.json({
    success: true,
    room,
    killerId: room.killerId,
    killerName: room.killerName,
  });
});

app.post('/api/rooms/:code/leave', (req, res) => {
  const room = findRoom(req.params.code);
  if (room) {
    const { playerId } = req.body;
    if (playerId && room.players[playerId]) {
      delete room.players[playerId];
      // If host left, transfer host
      if (room.hostId === playerId) {
        const remaining = Object.values(room.players);
        if (remaining.length > 0) {
          remaining[0].isHost = true;
          room.hostId = remaining[0].id;
        }
      }
      room.updatedAt = Date.now();
      broadcastToRoom(room.code, { type: 'room_state', room });
    }
  }
  res.json({ success: true });
});

app.post('/api/rooms/:code/sync', (req, res) => {
  const room = findRoom(req.params.code);
  if (!room) {
    return res.status(404).json({ success: false, message: 'Room not found' });
  }

  const { playerId, playerState, matchStatus, mapId } = req.body;
  if (playerId && playerState && room.players[playerId]) {
    room.players[playerId] = {
      ...room.players[playerId],
      ...playerState,
      lastSeen: Date.now(),
    };
  }

  if (matchStatus) room.status = matchStatus;
  if (mapId) room.mapId = mapId;
  room.updatedAt = Date.now();

  res.json({ success: true, room });
});

// Realtime WebSocket Room Relay
wss.on('connection', (ws) => {
  let userRoomCode = '';

  ws.on('message', (raw) => {
    try {
      const data = JSON.parse(raw.toString());
      if (data.type === 'join_room') {
        const room = findRoom(data.code);
        if (room) {
          userRoomCode = room.code;
          if (!socketRooms[room.code]) socketRooms[room.code] = new Set();
          socketRooms[room.code].add(ws);
          ws.send(JSON.stringify({ type: 'room_state', room }));
        }
      } else if (data.type === 'player_update') {
        if (userRoomCode && rooms[userRoomCode]) {
          const room = rooms[userRoomCode];
          if (room.players[data.playerId]) {
            room.players[data.playerId] = {
              ...room.players[data.playerId],
              ...data.playerState,
              lastSeen: Date.now(),
            };
            // Broadcast to other peers in room
            const peers = socketRooms[userRoomCode];
            if (peers) {
              const msg = JSON.stringify({
                type: 'player_moved',
                playerId: data.playerId,
                playerState: room.players[data.playerId],
              });
              peers.forEach((peer) => {
                if (peer !== ws && peer.readyState === WebSocket.OPEN) {
                  peer.send(msg);
                }
              });
            }
          }
        }
      }
    } catch {
      // ignore
    }
  });

  ws.on('close', () => {
    if (userRoomCode && socketRooms[userRoomCode]) {
      socketRooms[userRoomCode].delete(ws);
    }
  });
});

// Mount Vite in dev mode or static files in production
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  const PORT = 3000;

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Slopsaken server running on port ${PORT}`);
  });
}

startServer();
