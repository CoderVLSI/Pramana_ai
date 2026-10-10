import type { FastifyInstance } from "fastify";
import WebSocket from "ws";
import { createHash } from "node:crypto";
import type { SettingsVault } from "./settings-vault";
import { LiveToolDispatcher } from "./live-tools";
import { createLiveAgent } from "./live-agent";
export function attachLiveSessions(
  app: FastifyInstance,
  vault: SettingsVault,
  options: { createAgent?: typeof createLiveAgent } = {},
) {
  const wss = new (
    WebSocket as unknown as { Server: typeof import("ws").WebSocketServer }
  ).Server({ noServer: true, maxPayload: 65536 });
  const active = new Map<string, WebSocket>();
  const connections = new Set<WebSocket>();
  const createAgent = options.createAgent ?? createLiveAgent;
  const upgrade = (
    req: import("node:http").IncomingMessage,
    socket: import("node:stream").Duplex,
    head: Buffer,
  ) => {
    if (req.url?.split("?")[0] !== "/v1/live") return;
    const reject = () => {
      socket.write("HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n");
      socket.destroy();
    };
    const loopback = ["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(
      req.socket.remoteAddress ?? "",
    );
    const secure =
      !!(req.socket as import("node:tls").TLSSocket).encrypted ||
      (!!process.env.TRUST_PROXY &&
        process.env.TRUST_PROXY !== "false" &&
        req.headers["x-forwarded-proto"] === "https");
    const allowedOrigins = (
      process.env.CLIENT_ORIGIN ?? "http://localhost:8081"
    )
      .split(",")
      .map((x: string) => x.trim());
    const origin = req.headers.origin;
    if (
      (!secure && !loopback) ||
      (origin && !allowedOrigins.includes(origin)) ||
      connections.size >= 32 ||
      req.url !== "/v1/live"
    ) {
      reject();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) =>
      wss.emit("connection", ws, req),
    );
  };
  app.server.on("upgrade", upgrade);
  wss.on("connection", (ws) => {
    connections.add(ws);
    let agent: ReturnType<typeof createLiveAgent> | undefined;
    let identity: string | undefined;
    let authenticated = false,
      authenticating = false,
      closed = false;
    let minute = Date.now(),
      audioBytes = 0,
      textMessages = 0;
    let audioTotal = 0,
      messageCount = 0,
      controlCount = 0;
    const send = (event: Record<string, unknown>) => {
      if (
        ws.readyState !== WebSocket.OPEN ||
        ws.bufferedAmount > 4 * 1024 * 1024
      ) {
        shutdown();
        return;
      }
      ws.send(JSON.stringify(event));
    };
    const shutdown = () => {
      if (closed) return;
      closed = true;
      clearTimeout(authTimer);
      clearTimeout(sessionTimer);
      agent?.close();
      if (identity && active.get(identity) === ws) active.delete(identity);
      connections.delete(ws);
      if (ws.readyState === WebSocket.OPEN) ws.close(1000, "Session ended");
    };
    const fail = (message: string) => {
      send({ type: "error", message });
      shutdown();
    };
    const authTimer = setTimeout(
      () =>
        fail(
          "Connect your settings session before starting live conversation.",
        ),
      5000,
    );
    const sessionTimer = setTimeout(
      () =>
        fail(
          "This conversation reached its ten-minute limit. Reconnect to continue.",
        ),
      10 * 60000,
    );
    ws.on("error", shutdown);
    ws.on("close", shutdown);
    ws.on("message", async (raw, binary) => {
      try {
        if (closed || binary || raw.toString().length > 65536) {
          shutdown();
          return;
        }
        const event = JSON.parse(raw.toString());
        if (!event || typeof event !== "object" || Array.isArray(event))
          throw Error("Invalid message");
        if (!authenticated) {
          if (
            authenticating ||
            event.type !== "auth" ||
            typeof event.token !== "string" ||
            !/^[a-f0-9]{64}$/.test(event.token)
          )
            throw Error("Authenticate first");
          authenticating = true;
          const workIds = event.work_ids === undefined ? [] : event.work_ids;
          if (
            !Array.isArray(workIds) ||
            workIds.length > 160 ||
            workIds.some(
              (x: unknown) => typeof x !== "string" || x.length > 120,
            )
          )
            throw Error("Invalid collections");
          if (
            event.preferred_name !== undefined &&
            (typeof event.preferred_name !== "string" ||
              event.preferred_name.length > 80)
          )
            throw Error("Invalid name");
          const profile = await vault.read(event.token);
          if (closed) return;
          identity = createHash("sha256").update(event.token).digest("hex");
          if (active.has(identity)) {
            fail(
              "A live conversation is already connected for this device. Close it before reconnecting.",
            );
            return;
          }
          active.set(identity, ws);
          const tools = new LiveToolDispatcher(profile);
          agent = createAgent({
            profile,
            preferredName: event.preferred_name,
            enableWebSearch: event.enable_web_search === true,
            send: (value) => {
              if (value.type === "turn_end" || value.type === "interrupted")
                tools.beginTurn();
              send(
                value.type === "ready"
                  ? {
                      ...value,
                      source_mode: "live_generated",
                      generated_unverified: true,
                    }
                  : value,
              );
            },
            runTool: (name, args) => {
              let scoped = args;
              if (name === "search_scripture" && workIds.length) {
                if (
                  args.work_ids !== undefined &&
                  (!Array.isArray(args.work_ids) ||
                    args.work_ids.some((x) => !workIds.includes(x)))
                )
                  return Promise.resolve({
                    source_status: "not_verified",
                    evidence: [],
                    note: "Requested works are outside the selected live-session collection.",
                  });
                scoped = { ...args, work_ids: args.work_ids ?? workIds };
              }
              return tools.dispatch(name, scoped);
            },
          });
          authenticated = true;
          clearTimeout(authTimer);
          const originalEnd = agent.endInput.bind(agent),
            originalText = agent.inputText.bind(agent);
          agent.endInput = () => {
            tools.beginTurn();
            originalEnd();
          };
          agent.inputText = (text) => {
            tools.beginTurn();
            originalText(text);
          };
          await agent.start();
          return;
        }
        if (!agent) throw Error("Agent unavailable");
        if (Date.now() - minute >= 60000) {
          minute = Date.now();
          audioBytes = 0;
          textMessages = 0;
          messageCount = 0;
          controlCount = 0;
        }
        if (++messageCount > 1500) throw Error("Input rate limit");
        if (
          ["text", "end_input", "interrupt"].includes(event.type) &&
          ++controlCount > 60
        )
          throw Error("Control rate limit");
        switch (event.type) {
          case "audio": {
            const value = event.data;
            if (
              typeof value !== "string" ||
              !value.length ||
              value.length > 48000 ||
              value.length % 4 !== 0 ||
              !/^[A-Za-z0-9+/]+={0,2}$/.test(value)
            )
              throw Error("Invalid audio chunk");
            const bytes = Buffer.from(value, "base64");
            if (bytes.length % 2 || bytes.toString("base64") !== value)
              throw Error("Invalid PCM");
            audioBytes += bytes.length;
            audioTotal += bytes.length;
            if (audioBytes > 3 * 1024 * 1024 || audioTotal > 24 * 1024 * 1024)
              throw Error("Audio limit");
            agent.inputAudio(value);
            break;
          }
          case "text":
            if (
              typeof event.text !== "string" ||
              !event.text.trim() ||
              event.text.length > 2000 ||
              ++textMessages > 20
            )
              throw Error("Invalid text or request limit");
            agent.inputText(event.text);
            break;
          case "end_input":
            agent.endInput();
            break;
          case "interrupt":
            agent.interrupt();
            break;
          case "close":
            shutdown();
            break;
          default:
            throw Error("Unknown event");
        }
      } catch {
        fail(
          "Live conversation could not continue. Check your settings session and reconnect.",
        );
      }
    });
  });
  app.addHook("onClose", async () => {
    app.server.off("upgrade", upgrade);
    for (const ws of connections) ws.terminate();
    await new Promise<void>((resolve) => wss.close(() => resolve()));
  });
}
