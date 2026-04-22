import { io } from "socket.io-client";

const API_BASE = "http://127.0.0.1:5000";

async function postJson(path, payload, token, tenantId) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (tenantId != null) headers["X-Tenant-Id"] = String(tenantId);
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!response.ok) {
    throw new Error(`POST ${path} -> ${response.status} ${text}`);
  }
  return data;
}

async function getJson(path, token, tenantId) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (tenantId != null) headers["X-Tenant-Id"] = String(tenantId);
  const response = await fetch(`${API_BASE}${path}`, { headers });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!response.ok) {
    throw new Error(`GET ${path} -> ${response.status} ${text}`);
  }
  return data;
}

function onceWhere(socket, eventName, predicate, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(eventName, handler);
      reject(new Error(`Timeout waiting ${eventName}`));
    }, timeoutMs);

    const handler = (payload) => {
      if (!predicate || predicate(payload)) {
        clearTimeout(timer);
        socket.off(eventName, handler);
        resolve(payload);
      }
    };

    socket.on(eventName, handler);
  });
}

async function main() {
  const sender = await postJson("/api/v1/auth/login", {
    email: "magasinier@ops.demo.local",
    password: "DemoStaff123!",
  });

  const receiver = await postJson("/api/v1/auth/login", {
    email: "logisticien@ops.demo.local",
    password: "DemoStaff123!",
  });

  const tenantId = sender.user.company_id;
  const contacts = await getJson("/api/v1/chat/contacts?limit=200", sender.access_token, tenantId);
  const receiverContact = (contacts.items || []).find((contact) => contact.email === "logisticien@ops.demo.local");
  if (!receiverContact) {
    throw new Error("Receiver contact missing");
  }

  const conversationResponse = await postJson(
    "/api/v1/chat/conversations",
    {
      type: "private",
      participant_ids: [receiverContact.id],
      company_id: tenantId,
    },
    sender.access_token,
    tenantId
  );
  const conversationId = conversationResponse.conversation.id;

  const senderSocket = io(API_BASE, {
    transports: ["websocket"],
    auth: { token: sender.access_token },
  });
  const receiverSocket = io(API_BASE, {
    transports: ["websocket"],
    auth: { token: receiver.access_token },
  });

  try {
    await Promise.all([
      onceWhere(senderSocket, "presence:ready", (payload) => payload?.ok === true),
      onceWhere(receiverSocket, "presence:ready", (payload) => payload?.ok === true),
    ]);

    receiverSocket.emit("chat:join", { conversation_id: conversationId });
    await onceWhere(receiverSocket, "chat:joined", (payload) => Number(payload?.conversation_id) === Number(conversationId));

    const marker = `SMOKE-${Date.now()}`;
    const notificationPromise = onceWhere(
      receiverSocket,
      "chat:notification",
      (payload) => Number(payload?.conversation_id) === Number(conversationId),
      12000
    );
    const messagePromise = onceWhere(
      receiverSocket,
      "chat:message",
      (payload) => Number(payload?.conversation_id) === Number(conversationId) && (payload?.content || "").includes(marker),
      12000
    );

    await postJson(
      `/api/v1/chat/conversations/${conversationId}/messages`,
      {
        message_type: "text",
        content: marker,
        company_id: tenantId,
      },
      sender.access_token,
      tenantId
    );

    const [notification, message] = await Promise.all([notificationPromise, messagePromise]);

    await postJson(
      `/api/v1/chat/conversations/${conversationId}/read`,
      { company_id: tenantId },
      receiver.access_token,
      tenantId
    );

    console.log("SMOKE_OK");
    console.log(`CONVERSATION_ID ${conversationId}`);
    console.log(`MESSAGE_ID ${message.id}`);
    console.log(`NOTIFICATION_UNREAD ${notification.unread_count}`);
    console.log(`MESSAGE_MARKER ${marker}`);
  } finally {
    senderSocket.disconnect();
    receiverSocket.disconnect();
  }
}

main().catch((error) => {
  console.error("SMOKE_FAIL", error.message);
  process.exitCode = 1;
});
