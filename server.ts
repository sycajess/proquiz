import express from "express";
import http from "http";
import path from "path";
import fs from "fs";
import { WebSocket, WebSocketServer } from "ws";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import {
  Slide,
  Participant,
  PresentationSession,
  ClientMessage,
  ServerMessageType,
  LiveResponse,
} from "./src/types.js";
import { loadAllRooms, saveRoom, archiveRoom, PersistedRoom } from "./src/server/store.js";
import { filterText, filterWords } from "./src/server/moderation.js";
import { calculateQuizPoints } from "./src/server/scoring.js";
import { uniqueNickname } from "./src/server/nicknames.js";
import { generateDeck, getActiveProvider, getProviderLabel } from "./src/server/ai/generateDeck.js";
import { suggestTone } from "./src/server/ai/suggestTone.js";
import { suggestShareMessage } from "./src/server/ai/suggestShare.js";
import { apiLimiter, aiLimiter } from "./src/server/rateLimit.js";
import { startCleanupJob } from "./src/server/cleanup.js";
import { sessionToCsv } from "./src/server/csvExport.js";
import { logError } from "./src/server/monitoring.js";

dotenv.config();

const aiProvider = getActiveProvider();
if (aiProvider === "none") {
  console.warn("WARNING: No AI provider configured. Set HUGGINGFACE_API_TOKEN in .env.local");
} else {
  console.log(`AI deck generation: ${getProviderLabel()}`);
}

const app = express();
app.set("trust proxy", 1);
app.use(express.json());
app.use("/api", apiLimiter);

interface RoomState {
  session: PresentationSession;
  presenterSocket: WebSocket | null;
  participants: Map<string, { socket: WebSocket | null; data: Participant }>;
  responses: { [slideIndex: number]: LiveResponse[] };
  timerInterval?: NodeJS.Timeout;
  createdAt: number;
}

const activeRooms = new Map<string, RoomState>();

function generateRoomCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) code += Math.floor(Math.random() * 10);
  return code;
}

function toPersisted(room: RoomState): PersistedRoom {
  return {
    session: room.session,
    participants: Array.from(room.participants.values()).map((p) => p.data),
    responses: room.responses,
    createdAt: room.createdAt,
    updatedAt: Date.now(),
  };
}

function persistRoom(code: string) {
  const room = activeRooms.get(code);
  if (room) saveRoom(code, toPersisted(room));
}

function hydrateRooms() {
  const saved = loadAllRooms();
  for (const [code, data] of saved) {
    if (data.session.status === "ended") continue;
    activeRooms.set(code, {
      session: data.session,
      presenterSocket: null,
      participants: new Map(
        data.participants.map((p) => [p.id, { socket: null, data: { ...p, disconnected: true } }])
      ),
      responses: data.responses || {},
      createdAt: data.createdAt,
    });
  }
  console.log(`Restored ${activeRooms.size} room(s) from disk`);
}

// ----------------- API -----------------

app.get("/api/ai/status", (_req, res) => {
  res.json({
    provider: getActiveProvider(),
    label: getProviderLabel(),
    configured: getActiveProvider() !== "none",
  });
});

app.post("/api/suggest-share", aiLimiter, async (req, res) => {
  const { topic, joinUrl, roomCode } = req.body;
  if (!joinUrl || !roomCode) return res.status(400).json({ error: "joinUrl and roomCode required" });
  try {
    const message = await suggestShareMessage(topic || "live quiz", joinUrl, roomCode);
    res.json({ message });
  } catch (err: any) {
    logError("suggest-share", err);
    res.status(500).json({ error: err.message || "Share message failed" });
  }
});

app.post("/api/suggest-tone", aiLimiter, async (req, res) => {
  const { topic } = req.body;
  if (!topic?.trim()) return res.status(400).json({ error: "Topic is required" });
  if (getActiveProvider() === "none") {
    return res.status(503).json({ error: "AI not configured" });
  }
  try {
    const tone = await suggestTone(topic.trim());
    res.json({ tone });
  } catch (err: any) {
    logError("suggest-tone", err);
    res.status(500).json({ error: err.message || "Suggestion failed" });
  }
});

app.post("/api/generate-quiz", aiLimiter, async (req, res) => {
  const { topic, slideCount = 5, audience = "General", tone = "Casual", questionStyle, extraContext } = req.body;
  if (!topic) return res.status(400).json({ error: "Topic is required" });
  if (getActiveProvider() === "none") {
    return res.status(503).json({ error: "Set HUGGINGFACE_API_TOKEN in .env.local to enable AI generation" });
  }

  try {
    const { slides, provider } = await generateDeck({
      topic,
      slideCount,
      audience,
      tone,
      questionStyle,
      extraContext,
    });
    res.json({ slides, provider });
  } catch (err: any) {
    logError("generate-quiz", err);
    res.status(500).json({ error: err.message || "Generation failed" });
  }
});

function loadTemplates() {
  const candidates = [
    path.join(process.cwd(), "dist", "data", "templates.json"),
    path.join(process.cwd(), "src", "data", "templates.json"),
  ];
  for (const file of candidates) {
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, "utf-8"));
  }
  throw new Error("templates.json not found");
}

app.get("/api/templates", (_req, res) => {
  try {
    res.json(loadTemplates());
  } catch (err: any) {
    logError("templates", err);
    res.status(500).json({ error: "Templates unavailable" });
  }
});

app.post("/api/rooms", (req, res) => {
  const { slides, password } = req.body;
  if (!slides?.length) return res.status(400).json({ error: "Slides required" });

  const roomCode = generateRoomCode();
  const session: PresentationSession = {
    roomCode,
    slides,
    currentSlideIndex: 0,
    status: "lobby",
    showQuizCorrectAnswer: false,
    showQuizLeaderboard: false,
    slideTimer: null,
    timerActive: false,
    password: password?.trim() || undefined,
    presenterConnected: false,
  };

  activeRooms.set(roomCode, {
    session,
    presenterSocket: null,
    participants: new Map(),
    responses: {},
    createdAt: Date.now(),
  });
  persistRoom(roomCode);
  res.json({ roomCode, session });
});

app.get("/api/rooms/:code", (req, res) => {
  const room = activeRooms.get(req.params.code);
  if (!room) return res.status(404).json({ error: "Room not found" });
  res.json({
    roomCode: room.session.roomCode,
    status: room.session.status,
    currentSlideIndex: room.session.currentSlideIndex,
    slidesCount: room.session.slides.length,
    participantsCount: room.participants.size,
    slides: room.session.slides,
    hasPassword: !!room.session.password,
    presenterConnected: room.presenterSocket !== null,
  });
});

app.get("/api/rooms/:code/export", (req, res) => {
  const room = activeRooms.get(req.params.code);
  if (!room) return res.status(404).json({ error: "Room not found" });
  res.json(toPersisted(room));
});

app.get("/api/rooms/:code/export.csv", (req, res) => {
  const room = activeRooms.get(req.params.code);
  if (!room) return res.status(404).json({ error: "Room not found" });
  const csv = sessionToCsv(toPersisted(room));
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="proquiz-${req.params.code}.csv"`);
  res.send(csv);
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, rooms: activeRooms.size, ai: getActiveProvider() });
});

// ----------------- WebSocket -----------------

const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

server.on("upgrade", (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => wss.emit("connection", ws, request));
});

function sendMessage(ws: WebSocket, type: ServerMessageType, payload?: any) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type, payload }));
}

function broadcastToRoom(roomCode: string, type: ServerMessageType, supplier: (ws: WebSocket, id?: string) => any) {
  const room = activeRooms.get(roomCode);
  if (!room) return;
  if (room.presenterSocket) sendMessage(room.presenterSocket, type, supplier(room.presenterSocket, "presenter"));
  room.participants.forEach(({ socket, data }) => {
    if (socket) sendMessage(socket, type, supplier(socket, data.id));
  });
}

function sendFullRoomStateToAll(roomCode: string) {
  const room = activeRooms.get(roomCode);
  if (!room) return;
  const participantsList = Array.from(room.participants.values()).map((p) => p.data);
  const slideIndex = room.session.currentSlideIndex;
  const currentResponses = room.responses[slideIndex] || [];

  room.session.presenterConnected = room.presenterSocket !== null;
  broadcastToRoom(roomCode, "room_state_update", (_ws, sideId) => ({
    session: room.session,
    participants: participantsList,
    responses: currentResponses,
    allResponses: room.responses,
    isPresenter: sideId === "presenter",
    presenterDisconnected: !room.session.presenterConnected,
  }));
  persistRoom(roomCode);
}

function initTimerForSlide(roomCode: string) {
  const room = activeRooms.get(roomCode);
  if (!room) return;
  const slide = room.session.slides[room.session.currentSlideIndex];

  if (slide?.type === "quiz") {
    const limit = slide.timeLimit || 20;
    room.session.slideTimer = limit;
    room.session.timerActive = true;
    if (room.timerInterval) clearInterval(room.timerInterval);

    room.timerInterval = setInterval(() => {
      const r = activeRooms.get(roomCode);
      if (!r?.session.timerActive || r.session.slideTimer === null) {
        if (r?.timerInterval) clearInterval(r.timerInterval);
        return;
      }
      r.session.slideTimer -= 1;
      if (r.session.slideTimer <= 0) {
        r.session.slideTimer = 0;
        r.session.timerActive = false;
        r.session.showQuizCorrectAnswer = true;
        clearInterval(r.timerInterval);
        r.timerInterval = undefined;
      }
      sendFullRoomStateToAll(roomCode);
    }, 1000);
  } else {
    room.session.slideTimer = null;
    room.session.timerActive = false;
  }
}

function advanceSlide(room: RoomState, roomCode: string, nextIdx: number) {
  if (room.timerInterval) {
    clearInterval(room.timerInterval);
    room.timerInterval = undefined;
  }
  room.session.currentSlideIndex = nextIdx;
  room.session.showQuizCorrectAnswer = false;
  room.session.showQuizLeaderboard = false;
  initTimerForSlide(roomCode);
  sendFullRoomStateToAll(roomCode);
}

wss.on("connection", (ws: WebSocket) => {
  let userSession: { roomCode: string; side: "presenter" | "participant"; participantId?: string } | null = null;

  ws.on("message", (msgStr: string) => {
    try {
      const msg: ClientMessage = JSON.parse(msgStr);
      const { type, roomCode, payload } = msg;

      switch (type) {
        case "create_room": {
          if (!roomCode) break;
          const room = activeRooms.get(roomCode);
          if (room) {
            room.presenterSocket = ws;
            userSession = { roomCode, side: "presenter" };
            sendFullRoomStateToAll(roomCode);
          }
          break;
        }

        case "join_room": {
          const { code, nickname, avatar, password } = payload;
          const room = activeRooms.get(code);
          if (!room) {
            sendMessage(ws, "room_error", { message: `Room ${code} not found` });
            return;
          }
          if (room.session.password && room.session.password !== password) {
            sendMessage(ws, "room_error", { message: "Incorrect room password" });
            return;
          }

          const existingNames = Array.from(room.participants.values()).map((x) => x.data.nickname);
          const finalName = uniqueNickname(existingNames, nickname || "Explorer");
          const participantId = `usr_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
          const p: Participant = {
            id: participantId,
            nickname: finalName,
            avatar: avatar || "✨",
            score: 0,
            joinedAt: Date.now(),
          };
          room.participants.set(participantId, { socket: ws, data: p });
          userSession = { roomCode: code, side: "participant", participantId };

          sendMessage(ws, "room_joined", {
            participantId,
            session: room.session,
            participants: Array.from(room.participants.values()).map((x) => x.data),
          });
          sendFullRoomStateToAll(code);
          break;
        }

        case "rejoin_room": {
          const { code, participantId, nickname, avatar } = payload;
          const room = activeRooms.get(code);
          if (!room) {
            sendMessage(ws, "room_error", { message: `Room ${code} not found` });
            return;
          }

          const existing = room.participants.get(participantId);
          if (existing) {
            existing.socket = ws;
            existing.data.disconnected = false;
            if (nickname) existing.data.nickname = nickname;
            if (avatar) existing.data.avatar = avatar;
          } else {
            const p: Participant = {
              id: participantId,
              nickname: nickname || "Explorer",
              avatar: avatar || "✨",
              score: 0,
              joinedAt: Date.now(),
            };
            room.participants.set(participantId, { socket: ws, data: p });
          }

          userSession = { roomCode: code, side: "participant", participantId };
          sendMessage(ws, "room_joined", {
            participantId,
            session: room.session,
            participants: Array.from(room.participants.values()).map((x) => x.data),
            reconnected: true,
          });
          sendFullRoomStateToAll(code);
          break;
        }

        case "start_presentation": {
          if (userSession?.side !== "presenter") return;
          const room = activeRooms.get(userSession.roomCode);
          if (!room) return;
          room.session.status = "presenting";
          room.session.currentSlideIndex = 0;
          room.session.showQuizCorrectAnswer = false;
          room.session.showQuizLeaderboard = false;
          initTimerForSlide(userSession.roomCode);
          sendFullRoomStateToAll(userSession.roomCode);
          break;
        }

        case "next_slide": {
          if (userSession?.side !== "presenter") return;
          const room = activeRooms.get(userSession.roomCode);
          if (!room) return;
          const next = room.session.currentSlideIndex + 1;
          if (next < room.session.slides.length) {
            advanceSlide(room, userSession.roomCode, next);
          } else {
            room.session.status = "ended";
            sendFullRoomStateToAll(userSession.roomCode);
            archiveRoom(userSession.roomCode, toPersisted(room));
            activeRooms.delete(userSession.roomCode);
          }
          break;
        }

        case "prev_slide": {
          if (userSession?.side !== "presenter") return;
          const room = activeRooms.get(userSession.roomCode);
          if (!room || room.session.currentSlideIndex <= 0) return;
          advanceSlide(room, userSession.roomCode, room.session.currentSlideIndex - 1);
          break;
        }

        case "goto_slide": {
          if (userSession?.side !== "presenter") return;
          const room = activeRooms.get(userSession.roomCode);
          const idx = payload?.index;
          if (!room || idx < 0 || idx >= room.session.slides.length) return;
          advanceSlide(room, userSession.roomCode, idx);
          break;
        }

        case "toggle_reveal_answer": {
          if (userSession?.side !== "presenter") return;
          const room = activeRooms.get(userSession.roomCode);
          if (room) {
            room.session.showQuizCorrectAnswer = !room.session.showQuizCorrectAnswer;
            sendFullRoomStateToAll(userSession.roomCode);
          }
          break;
        }

        case "toggle_leaderboard": {
          if (userSession?.side !== "presenter") return;
          const room = activeRooms.get(userSession.roomCode);
          if (room) {
            room.session.showQuizLeaderboard = !room.session.showQuizLeaderboard;
            sendFullRoomStateToAll(userSession.roomCode);
          }
          break;
        }

        case "upvote_qa": {
          if (userSession?.side !== "participant" || !userSession.participantId) return;
          const room = activeRooms.get(userSession.roomCode);
          if (!room) return;
          const idx = room.session.currentSlideIndex;
          const qaId = payload?.qaId;
          const list = room.responses[idx] || [];
          const item = list.find((r) => r.type === "qa" && r.payload.id === qaId);
          if (item && item.type === "qa") {
            if (!item.payload.upvotes.includes(userSession.participantId)) {
              item.payload.upvotes.push(userSession.participantId);
            }
            sendFullRoomStateToAll(userSession.roomCode);
          }
          break;
        }

        case "moderate_response": {
          if (userSession?.side !== "presenter") return;
          const room = activeRooms.get(userSession.roomCode);
          if (!room) return;
          const { slideIndex, responseId, hidden } = payload;
          const list = room.responses[slideIndex] || [];
          const item = list.find((r) => {
            if (r.type === "qa") return r.payload.id === responseId;
            if (r.type === "word_cloud") return r.payload.participantId === responseId;
            return false;
          });
          if (item) {
            if (item.type === "qa") item.payload.hidden = hidden;
            if (item.type === "word_cloud") item.payload.hidden = hidden;
            sendFullRoomStateToAll(userSession.roomCode);
          }
          break;
        }

        case "submit_response": {
          if (userSession?.side !== "participant" || !userSession.participantId) return;
          const room = activeRooms.get(userSession.roomCode);
          if (!room) return;

          const activeIdx = room.session.currentSlideIndex;
          const activeSlide = room.session.slides[activeIdx];
          const participantId = userSession.participantId;
          const participantObj = room.participants.get(participantId);
          if (!participantObj || activeSlide.type === "content") return;

          if (!room.responses[activeIdx]) room.responses[activeIdx] = [];

          const already = room.responses[activeIdx].some((r: any) => {
            if (r.type === "qa") return r.payload.participantId === participantId;
            return r.payload?.participantId === participantId;
          });
          if (already && activeSlide.type !== "qa") return;

          const submission = payload;
          let answerFeedback: any = null;

          if (activeSlide.type === "quiz") {
            const maxSeconds = activeSlide.timeLimit || 20;
            const elapsedMs = submission.timeTaken || 0;
            const chosenIdx = submission.optionIndex;
            const isCorrect = chosenIdx === activeSlide.correctOptionIndex;
            const points = calculateQuizPoints(isCorrect, elapsedMs, maxSeconds);
            participantObj.data.score += points;
            participantObj.data.lastAnswerCorrect = isCorrect;
            participantObj.data.lastPointsEarned = points;
            const quizPayload = { participantId, optionIndex: chosenIdx, timeTaken: elapsedMs, correct: isCorrect, pointsEarned: points };
            room.responses[activeIdx].push({ type: "quiz", payload: quizPayload });
            answerFeedback = quizPayload;
          } else if (activeSlide.type === "multiple_choice") {
            const mcPayload = { participantId, optionIndex: submission.optionIndex };
            room.responses[activeIdx].push({ type: "multiple_choice", payload: mcPayload });
            answerFeedback = mcPayload;
          } else if (activeSlide.type === "word_cloud") {
            const wcPayload = { participantId, words: filterWords(submission.words || []) };
            room.responses[activeIdx].push({ type: "word_cloud", payload: wcPayload });
            answerFeedback = wcPayload;
          } else if (activeSlide.type === "rating_scale") {
            const ratingPayload = { participantId, ratings: submission.ratings || [] };
            room.responses[activeIdx].push({ type: "rating_scale", payload: ratingPayload });
            answerFeedback = ratingPayload;
          } else if (activeSlide.type === "qa") {
            const qaPayload = {
              id: `qa_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
              participantId,
              text: filterText(submission.text || ""),
              upvotes: [] as string[],
            };
            if (!qaPayload.text) return;
            room.responses[activeIdx].push({ type: "qa", payload: qaPayload });
            answerFeedback = qaPayload;
          }

          sendMessage(ws, "response_received", { success: true, feedback: answerFeedback });
          sendFullRoomStateToAll(userSession.roomCode);
          break;
        }

        case "reset_room": {
          if (userSession?.side !== "presenter") return;
          const room = activeRooms.get(userSession.roomCode);
          if (!room) return;
          if (room.timerInterval) clearInterval(room.timerInterval);
          room.session.status = "lobby";
          room.session.currentSlideIndex = 0;
          room.session.showQuizCorrectAnswer = false;
          room.session.showQuizLeaderboard = false;
          room.session.slideTimer = null;
          room.session.timerActive = false;
          room.responses = {};
          room.participants.forEach((p) => {
            p.data.score = 0;
            p.data.lastAnswerCorrect = undefined;
            p.data.lastPointsEarned = 0;
          });
          sendFullRoomStateToAll(userSession.roomCode);
          break;
        }
      }
    } catch (err) {
      console.error("WS error:", err);
    }
  });

  ws.on("close", () => {
    if (!userSession) return;
    const room = activeRooms.get(userSession.roomCode);
    if (!room) return;

    if (userSession.side === "presenter") {
      room.presenterSocket = null;
      room.session.presenterConnected = false;
      sendFullRoomStateToAll(userSession.roomCode);
      persistRoom(userSession.roomCode);
    } else if (userSession.participantId) {
      const p = room.participants.get(userSession.participantId);
      if (p) {
        p.socket = null;
        p.data.disconnected = true;
      }
      sendFullRoomStateToAll(userSession.roomCode);
    }
  });
});

// ----------------- Start -----------------

const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  hydrateRooms();
  startCleanupJob(() => new Set(activeRooms.keys()));

  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    logError("unhandled", err);
    res.status(500).json({ error: "Internal server error" });
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => res.sendFile(path.join(distPath, "index.html")));
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
