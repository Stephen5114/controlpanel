import "../../styles/support.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { HubConnection, HubConnectionBuilder, HubConnectionState, LogLevel } from "@microsoft/signalr";
import { BookOpen, ImageIcon, Lock, MessageSquare, Plus, Search, Send, Ticket, Wifi, WifiOff } from "lucide-react";
import {
  closeSupportChat,
  closeSupportTicket,
  createSupportTicket,
  getActiveApiBaseUrl,
  getSupportAttachment,
  getSupportTicket,
  getSupportTickets,
  replySupportTicket,
  startSupportChat,
  type SupportAttachment,
  type SupportChatMessage,
  type SupportChatSession,
  type SupportMessage,
  type SupportTicket,
  uploadSupportAttachment,
} from "../lib/customer-api";
import { getCustomerSession } from "../lib/customer-session";
import { formatCompactDate, formatDateTime } from "../lib/display";
import { useLocalization } from "../lib/i18n";

type SupportView = "tickets" | "new" | "kb" | "chat";

const SUPPORT_POLL_INTERVAL_MS = 12000;
const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
const MAX_ATTACHMENTS = 3;

const knowledgeBase = [
  { title: "Website down", body: "Check recent publishes, DNS records, site runtime status, and whether your app pool is running." },
  { title: "Domain and DNS", body: "Use Domains to confirm nameservers, A/CNAME records, HTTPS status, and hostname binding state." },
  { title: "Email setup", body: "Confirm MX, SPF, DKIM, and SMTP credentials before opening a deliverability ticket." },
  { title: "Billing", body: "Review plan, renewal, and domain checkout history before requesting invoice help." },
  { title: "Database", body: "Check database provisioning state, password rotation, and storage quota from your subscription workspace." },
];

// Cache attachment object URLs across re-renders/ticket switches so images are not
// re-downloaded every time. Capped to bound memory.
const ATTACHMENT_CACHE_LIMIT = 60;
const attachmentUrlCache = new Map<string, string>();
function cacheAttachmentUrl(id: string, objectUrl: string) {
  if (attachmentUrlCache.size >= ATTACHMENT_CACHE_LIMIT) {
    const oldest = attachmentUrlCache.keys().next().value;
    if (oldest) {
      const stale = attachmentUrlCache.get(oldest);
      if (stale) URL.revokeObjectURL(stale);
      attachmentUrlCache.delete(oldest);
    }
  }
  attachmentUrlCache.set(id, objectUrl);
}

export function SupportPage() {
  const { t } = useLocalization();
  const session = getCustomerSession();
  const [view, setView] = useState<SupportView>("tickets");
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newSubject, setNewSubject] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [creating, setCreating] = useState(false);
  const [reply, setReply] = useState("");
  const [replyFiles, setReplyFiles] = useState<File[]>([]);
  const [replying, setReplying] = useState(false);
  const [chat, setChat] = useState<SupportChatSession | null>(null);
  const [chatMessage, setChatMessage] = useState("");
  const [chatSending, setChatSending] = useState(false);
  const [kbSearch, setKbSearch] = useState("");
  const [connectionState, setConnectionState] = useState<"disconnected" | "connecting" | "connected">("disconnected");
  const [chatClosed, setChatClosed] = useState(false);
  const [staffTyping, setStaffTyping] = useState(false);
  const connectionRef = useRef<HubConnection | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const staffTypingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function pickImageFiles(list: FileList | null): { files: File[]; error: string | null } {
    const all = Array.from(list ?? []);
    const valid = all.filter((file) => ALLOWED_IMAGE_TYPES.includes(file.type) && file.size <= MAX_ATTACHMENT_BYTES);
    const rejected = all.length - valid.length;
    const capped = valid.slice(0, MAX_ATTACHMENTS);
    let errorMsg: string | null = null;
    if (rejected > 0) errorMsg = t("Some files were skipped — only PNG, JPG, or WebP up to 5 MB are allowed.", "Some files were skipped — only PNG, JPG, or WebP up to 5 MB are allowed.");
    else if (valid.length > MAX_ATTACHMENTS) errorMsg = t("Only the first {max} images are attached.", "Only the first {max} images are attached.").replace("{max}", String(MAX_ATTACHMENTS));
    return { files: capped, error: errorMsg };
  }

  function getStatusLabel(status: string) {
    if (status === "open") return t("Open", "Open");
    if (status === "in_progress") return t("In Progress", "In Progress");
    if (status === "waiting_customer") return t("Waiting Customer", "Waiting Customer");
    if (status === "resolved") return t("Resolved", "Resolved");
    return status.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  useEffect(() => {
    if (!session) return;
    setLoading(true);
    getSupportTickets(session)
      .then((items) => {
        setTickets(items);
        setSelectedTicketId((current) => current ?? items[0]?.id ?? null);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : t("Failed to load support tickets.", "Failed to load support tickets.")))
      .finally(() => setLoading(false));
  }, [session?.token]);

  useEffect(() => {
    if (!session || !selectedTicketId) {
      setSelectedTicket(null);
      return;
    }

    getSupportTicket(session, selectedTicketId)
      .then(setSelectedTicket)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : t("Failed to load ticket.", "Failed to load ticket.")));
  }, [selectedTicketId, session?.token]);

  useEffect(() => {
    if (!session) return;
    let disposed = false;
    const connection = new HubConnectionBuilder()
      .withUrl(`${getActiveApiBaseUrl()}/hubs/support-chat`, { accessTokenFactory: () => session.token, withCredentials: false })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build();

    connectionRef.current = connection;
    connection.onreconnecting(() => setConnectionState("connecting"));
    connection.onreconnected(() => setConnectionState("connected"));
    connection.onclose(() => setConnectionState("disconnected"));
    connection.on("TicketMessageReceived", (message: SupportMessage) => {
      setSelectedTicket((current) => current && current.id === message.ticketId ? { ...current, messages: mergeById(current.messages, message) } : current);
      // Bump the matching row locally instead of refetching the whole list.
      setTickets((current) => current
        .map((ticket) => ticket.id === message.ticketId
          ? { ...ticket, updatedUtc: message.createdUtc, messageCount: ticket.messageCount + 1 }
          : ticket)
        .sort(sortTickets));
    });
    connection.on("TicketUpdated", (ticket: SupportTicket) => {
      setTickets((current) => mergeById(current, ticket).sort(sortTickets));
      setSelectedTicket((current) => current && current.id === ticket.id ? { ...ticket, messages: current.messages.length ? current.messages : ticket.messages } : current);
    });
    connection.on("ChatMessageReceived", (message: SupportChatMessage) => {
      setChat((current) => current && current.id === message.sessionId ? { ...current, messages: mergeById(current.messages, message) } : current);
    });
    connection.on("ChatSessionClosed", (payload: { sessionId: string; reason: string }) => {
      setChat((current) => {
        if (current && current.id === payload.sessionId) {
          setChatClosed(true);
          return current;
        }
        return current;
      });
    });
    connection.on("UserTyping", (payload: { sessionId: string; senderType: string; senderEmail: string; isTyping: boolean }) => {
      if (payload.senderType !== "staff") return;
      if (payload.isTyping) {
        setStaffTyping(true);
        if (staffTypingTimeoutRef.current) clearTimeout(staffTypingTimeoutRef.current);
        staffTypingTimeoutRef.current = setTimeout(() => setStaffTyping(false), 4000);
      } else {
        setStaffTyping(false);
      }
    });

    setConnectionState("connecting");
    connection.start()
      .then(() => {
        if (disposed) return;
        setConnectionState("connected");
      })
      .catch(() => setConnectionState("disconnected"));

    return () => {
      disposed = true;
      connection.stop().catch(() => undefined);
    };
  }, [session?.token]);

  useEffect(() => {
    if (!selectedTicketId || connectionRef.current?.state !== HubConnectionState.Connected) return;
    connectionRef.current.invoke("JoinTicket", selectedTicketId).catch(() => undefined);
  }, [selectedTicketId, connectionState]);

  // Polling fallback: when the realtime socket is unavailable (proxies, blocked
  // WebSockets), keep tickets/chat fresh by polling.
  useEffect(() => {
    if (!session) return;
    const poll = () => {
      if (connectionRef.current?.state === HubConnectionState.Connected) return;
      void refreshTickets();
      if (selectedTicketId) {
        getSupportTicket(session, selectedTicketId).then(setSelectedTicket).catch(() => undefined);
      }
      if (view === "chat" && chat) {
        startSupportChat(session).then(setChat).catch(() => undefined);
      }
    };
    const id = window.setInterval(poll, SUPPORT_POLL_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [session?.token, selectedTicketId, view, chat?.id, connectionState]);

  const counts = useMemo(() => ({
    open: tickets.filter((ticket) => ticket.status === "open").length,
    inProgress: tickets.filter((ticket) => ticket.status === "in_progress" || ticket.status === "waiting_customer").length,
    resolved: tickets.filter((ticket) => ticket.status === "resolved").length,
  }), [tickets]);

  const filteredTickets = useMemo(() => {
    const term = search.trim().toLowerCase();
    return tickets.filter((ticket) => {
      const matchesStatus = statusFilter === "all" || ticket.status === statusFilter;
      const matchesSearch = !term || ticket.subject.toLowerCase().includes(term) || ticket.id.toLowerCase().includes(term);
      return matchesStatus && matchesSearch;
    });
  }, [search, statusFilter, tickets]);

  const filteredKb = useMemo(() => {
    const term = kbSearch.trim().toLowerCase();
    if (!term) return knowledgeBase;
    return knowledgeBase.filter((item) => item.title.toLowerCase().includes(term) || item.body.toLowerCase().includes(term));
  }, [kbSearch]);

  const newTicketValid = newSubject.trim().length > 0 && newMessage.trim().length > 0;

  async function refreshTickets() {
    if (!session) return;
    const items = await getSupportTickets(session);
    setTickets(items);
  }

  async function handleCreateTicket() {
    if (!session || creating || !newTicketValid) return;
    setError(null);
    setCreating(true);
    try {
      const result = await createSupportTicket(session, { subject: newSubject.trim(), message: newMessage.trim() });
      if (!result.success || !result.ticket) throw new Error(result.message);
      if (result.supportMessage && newFiles.length) {
        await Promise.all(newFiles.slice(0, MAX_ATTACHMENTS).map((file) => uploadSupportAttachment(session, result.ticket!.id, result.supportMessage!.id, file)));
      }
      const full = await getSupportTicket(session, result.ticket.id);
      setTickets((current) => mergeById(current, full).sort(sortTickets));
      setSelectedTicketId(full.id);
      setSelectedTicket(full);
      setNewSubject("");
      setNewMessage("");
      setNewFiles([]);
      setView("tickets");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("Failed to create ticket.", "Failed to create ticket."));
    } finally {
      setCreating(false);
    }
  }

  async function handleReply() {
    if (!session || !selectedTicket || replying) return;
    const body = reply.trim();
    if (!body && replyFiles.length === 0) return;
    setError(null);
    setReplying(true);
    try {
      const result = await replySupportTicket(session, selectedTicket.id, body || "(see attachment)");
      if (!result.success || !result.ticket) throw new Error(result.message);
      if (result.supportMessage && replyFiles.length) {
        await Promise.all(replyFiles.slice(0, MAX_ATTACHMENTS).map((file) => uploadSupportAttachment(session, selectedTicket.id, result.supportMessage!.id, file)));
        const full = await getSupportTicket(session, selectedTicket.id);
        setSelectedTicket(full);
        setTickets((current) => mergeById(current, full).sort(sortTickets));
      } else {
        setSelectedTicket(result.ticket);
        setTickets((current) => mergeById(current, result.ticket!).sort(sortTickets));
      }
      setReply("");
      setReplyFiles([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("Failed to send reply.", "Failed to send reply."));
    } finally {
      setReplying(false);
    }
  }

  async function handleCloseTicket() {
    if (!session || !selectedTicket) return;
    if (selectedTicket.status === "resolved") return;
    const confirmed = typeof window !== "undefined"
      ? window.confirm(t("Close this ticket? You can reopen it later by replying.", "Close this ticket? You can reopen it later by replying."))
      : true;
    if (!confirmed) return;
    setError(null);
    try {
      const result = await closeSupportTicket(session, selectedTicket.id);
      if (!result.success || !result.ticket) throw new Error(result.message);
      setSelectedTicket(result.ticket);
      setTickets((current) => mergeById(current, result.ticket!).sort(sortTickets));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("Failed to close ticket.", "Failed to close ticket."));
    }
  }

  async function handleEndChat() {
    if (!session || !chat) return;
    try {
      await closeSupportChat(session, chat.id);
      setChat(null);
      setChatClosed(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("Failed to close chat.", "Failed to close chat."));
    }
  }

  function sendTypingIndicator() {
    if (!chat || connectionRef.current?.state !== HubConnectionState.Connected) return;
    connectionRef.current.invoke("TypingIndicator", chat.id, true).catch(() => undefined);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      connectionRef.current?.invoke("TypingIndicator", chat.id, false).catch(() => undefined);
    }, 2000);
  }

  async function handleStartChat() {
    if (!session) return;
    setView("chat");
    setChatClosed(false);
    setStaffTyping(false);
    const started = await startSupportChat(session);
    setChat(started);
    if (connectionRef.current?.state === HubConnectionState.Connected) {
      await connectionRef.current.invoke("JoinChat", started.id).catch(() => undefined);
    }
  }

  async function handleSendChat() {
    if (!chat || !chatMessage.trim() || chatSending) return;
    const body = chatMessage.trim();
    setChatMessage("");
    setChatSending(true);
    try {
      if (connectionRef.current?.state === HubConnectionState.Connected) {
        await connectionRef.current.invoke("SendChatMessage", chat.id, body);
      } else {
        throw new Error("not connected");
      }
    } catch {
      setError(t("Live chat message failed to send. Please retry.", "Live chat message failed to send. Please retry."));
      setChatMessage(body);
    } finally {
      setChatSending(false);
    }
  }

  return (
    <div className="support-shell">
      <aside className="support-sidebar">
        <div>
          <p className="eyebrow">{t("Support", "Support")}</p>
          <h1>{t("Support Center", "Support Center")}</h1>
        </div>
        <nav className="support-nav">
          <SupportNavButton active={view === "tickets"} icon={<Ticket size={18} />} label={t("My Tickets", "My Tickets")} onClick={() => setView("tickets")} />
          <SupportNavButton active={view === "new"} icon={<Plus size={18} />} label={t("New Ticket", "New Ticket")} onClick={() => setView("new")} />
          <SupportNavButton active={view === "kb"} icon={<BookOpen size={18} />} label={t("Knowledge Base", "Knowledge Base")} onClick={() => setView("kb")} />
          <SupportNavButton active={view === "chat"} icon={<MessageSquare size={18} />} label={t("Live Chat", "Live Chat")} onClick={handleStartChat} />
        </nav>
        <div className="support-sidebar__counts">
          <p>{t("Your Tickets", "Your Tickets")}</p>
          <CountRow label={t("Open", "Open")} value={counts.open} tone="danger" />
          <CountRow label={t("In Progress", "In Progress")} value={counts.inProgress} tone="info" />
          <CountRow label={t("Resolved", "Resolved")} value={counts.resolved} tone="success" />
        </div>
      </aside>

      <section className="support-main">
        {error ? <div className="inline-message inline-message--error" role="alert">{error}</div> : null}
        {view === "tickets" ? (
          <div className="support-ticket-layout">
            <div className="support-list-pane">
              <div className="support-search">
                <Search size={18} />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("Search tickets...", "Search tickets...")} aria-label="Search tickets" />
              </div>
              <div className="support-filters" role="tablist" aria-label="Filter tickets by status">
                {["all", "open", "in_progress", "waiting_customer", "resolved"].map((status) => (
                  <button key={status} role="tab" aria-selected={statusFilter === status} className={statusFilter === status ? "is-active" : ""} onClick={() => setStatusFilter(status)} type="button">
                    {status === "all" ? t("All", "All") : getStatusLabel(status)}
                  </button>
                ))}
              </div>
              <div className="support-ticket-list" aria-busy={loading}>
                {loading ? <SupportListSkeleton /> : null}
                {!loading && filteredTickets.map((ticket) => (
                  <button key={ticket.id} className={`support-ticket-row${selectedTicketId === ticket.id ? " is-active" : ""}`} onClick={() => setSelectedTicketId(ticket.id)} type="button">
                    <span className="support-ticket-row__badges">
                      <span className={`support-status support-status--${ticket.status}`}>{getStatusLabel(ticket.status)}</span>
                      {ticket.status === "waiting_customer" ? <span className="support-status support-status--reply-needed">{t("Your reply needed", "Your reply needed")}</span> : null}
                    </span>
                    <strong>{ticket.subject}</strong>
                    <small>{formatCompactDate(ticket.updatedUtc)} · {t("{count} messages", "{count} messages").replace("{count}", String(ticket.messageCount))}</small>
                  </button>
                ))}
                {!loading && filteredTickets.length === 0 ? (
                  <div className="support-empty">
                    <p className="muted">{tickets.length === 0 ? t("You have no tickets yet.", "You have no tickets yet.") : t("No tickets match this view.", "No tickets match this view.")}</p>
                    <button className="primary-button" type="button" onClick={() => setView("new")}>{t("Create your first ticket", "Create your first ticket")}</button>
                  </div>
                ) : null}
              </div>
            </div>
            <TicketDetail
              ticket={selectedTicket}
              reply={reply}
              setReply={setReply}
              replyFiles={replyFiles}
              setReplyFiles={setReplyFiles}
              onReply={handleReply}
              replying={replying}
              onCloseTicket={handleCloseTicket}
              sessionToken={session?.token ?? ""}
              onFileError={setError}
              getStatusLabel={getStatusLabel}
            />
          </div>
        ) : null}

        {view === "new" ? (
          <section className="support-compose card">
            <h2>{t("Create a support ticket", "Create a support ticket")}</h2>
            <p className="muted">{t("Describe the issue and attach up to 3 screenshots. We keep replies in this portal.", "Describe the issue and attach up to 3 screenshots. We keep replies in this portal.")}</p>
            <label>{t("Subject", "Subject")}<input value={newSubject} onChange={(event) => setNewSubject(event.target.value)} placeholder={t("Website down - urgent help needed", "Website down - urgent help needed")} /></label>
            <label>{t("Message", "Message")}<textarea value={newMessage} onChange={(event) => setNewMessage(event.target.value)} rows={8} placeholder={t("Tell us what changed, what you expected, and what you see now.", "Tell us what changed, what you expected, and what you see now.")} /></label>
            <label className="support-file-picker">
              <ImageIcon size={18} />
              <span>{newFiles.length ? t("{count} image(s) selected", "{count} image(s) selected").replace("{count}", String(newFiles.length)) : t("Attach screenshots", "Attach screenshots")}</span>
              <input type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={(event) => { const r = pickImageFiles(event.target.files); setNewFiles(r.files); setError(r.error); }} />
            </label>
            <button className="primary-button" onClick={handleCreateTicket} disabled={!newTicketValid || creating} type="button">{creating ? t("Creating…", "Creating…") : t("Create ticket", "Create ticket")}</button>
          </section>
        ) : null}

        {view === "kb" ? (
          <section className="support-kb-view">
            <div className="support-search">
              <Search size={18} />
              <input value={kbSearch} onChange={(event) => setKbSearch(event.target.value)} placeholder={t("Search the knowledge base...", "Search the knowledge base...")} aria-label="Search knowledge base" />
            </div>
            <div className="support-kb">
              {filteredKb.map((item) => (
                <article key={item.title} className="card">
                  <h3>{t(item.title, item.title)}</h3>
                  <p className="muted">{t(item.body, item.body)}</p>
                </article>
              ))}
              {filteredKb.length === 0 ? <p className="muted">{t("No articles match \"{query}\". Try the Live Chat or open a ticket.", "No articles match \"{query}\". Try the Live Chat or open a ticket.").replace("{query}", kbSearch)}</p> : null}
            </div>
          </section>
        ) : null}

        {view === "chat" ? (
          <section className="support-chat card">
            <div className="section-head">
              <div>
                <h2>{t("Live Chat", "Live Chat")}</h2>
                <p className="muted">{t("Realtime support. If the team is offline, your messages stay available when they return.", "Realtime support. If the team is offline, your messages stay available when they return.")}</p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                {chat && !chatClosed && (
                  <button className="secondary-button" onClick={() => void handleEndChat()} type="button" style={{ fontSize: "0.75rem", padding: "0.35rem 0.75rem" }}>
                    {t("End Chat", "End Chat")}
                  </button>
                )}
                <ConnectionBadge state={connectionState} />
              </div>
            </div>
            <div className="support-thread support-thread--chat">
              {(chat?.messages ?? []).map((message) =>
                message.senderType === "system" ? (
                  <div key={message.id} style={{ textAlign: "center", padding: "0.5rem 0" }}>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontStyle: "italic" }}>— {message.body} —</span>
                  </div>
                ) : (
                  <MessageBubble key={message.id} message={message} sessionToken={session?.token ?? ""} />
                )
              )}
              {!chat && !chatClosed ? <button className="primary-button" onClick={handleStartChat} type="button">{t("Start live chat", "Start live chat")}</button> : null}
              {chatClosed && (
                <div style={{ textAlign: "center", padding: "1rem 0" }}>
                  <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", fontStyle: "italic", marginBottom: "0.75rem" }}>{t("This chat session has been closed.", "This chat session has been closed.")}</p>
                  <button className="primary-button" onClick={handleStartChat} type="button">{t("Start new chat", "Start new chat")}</button>
                </div>
              )}
            </div>
            {staffTyping && !chatClosed && (
              <div style={{ padding: "0.25rem 1rem", fontSize: "0.75rem", color: "var(--accent)", fontStyle: "italic" }}>
                {t("Support agent is typing...", "Support agent is typing...")}
              </div>
            )}
            {!chatClosed && (
              <div className="support-reply">
                <input
                  value={chatMessage}
                  onChange={(event) => { setChatMessage(event.target.value); sendTypingIndicator(); }}
                  onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void handleSendChat(); } }}
                  placeholder={t("Type your message...", "Type your message...")}
                  aria-label="Live chat message"
                />
                <button onClick={handleSendChat} disabled={!chat || !chatMessage.trim() || chatSending || connectionState !== "connected"} type="button" aria-label="Send chat message"><Send size={16} /></button>
              </div>
            )}
          </section>
        ) : null}
      </section>
    </div>
  );
}

function TicketDetail({ ticket, reply, setReply, replyFiles, setReplyFiles, onReply, replying, onCloseTicket, sessionToken, onFileError, getStatusLabel }: {
  ticket: SupportTicket | null;
  reply: string;
  setReply: (value: string) => void;
  replyFiles: File[];
  setReplyFiles: (files: File[]) => void;
  onReply: () => void;
  replying: boolean;
  onCloseTicket: () => void;
  sessionToken: string;
  onFileError: (message: string | null) => void;
  getStatusLabel: (status: string) => string;
}) {
  const { t } = useLocalization();
  if (!ticket) return <div className="support-detail empty-panel"><h2>{t("Select a ticket", "Select a ticket")}</h2><p>{t("Choose a ticket to view the full conversation.", "Choose a ticket to view the full conversation.")}</p></div>;
  const isClosed = ticket.status === "resolved";
  return (
    <div className="support-detail">
      <div className="support-detail__head">
        <div>
          <span className="support-ticket-row__badges">
            <span className={`support-status support-status--${ticket.status}`}>{getStatusLabel(ticket.status)}</span>
            {ticket.status === "waiting_customer" ? <span className="support-status support-status--reply-needed">{t("Your reply needed", "Your reply needed")}</span> : null}
          </span>
          <h2>{ticket.subject}</h2>
          <p className="muted">{t("Updated {time}", "Updated {time}").replace("{time}", formatDateTime(ticket.updatedUtc))}</p>
        </div>
        {!isClosed ? (
          <button
            type="button"
            className="secondary-button secondary-button--compact secondary-button--danger"
            onClick={onCloseTicket}
            title={t("Close this ticket", "Close this ticket")}
          >
            <Lock size={14} />
            <span style={{ marginLeft: 6 }}>{t("Close ticket", "Close ticket")}</span>
          </button>
        ) : null}
      </div>
      <div className="support-thread">
        {ticket.messages.map((message) => <MessageBubble key={message.id} message={message} sessionToken={sessionToken} />)}
      </div>
      {isClosed ? <p className="muted support-reopen-hint">{t("This ticket is resolved. Replying below will reopen it.", "This ticket is resolved. Replying below will reopen it.")}</p> : null}
      <div className="support-reply support-reply--stacked">
        <textarea
          value={reply}
          onChange={(event) => setReply(event.target.value)}
          onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); onReply(); } }}
          placeholder={isClosed ? t("Reply to reopen this ticket…", "Reply to reopen this ticket…") : t("Reply to support…  (Enter to send, Shift+Enter for a new line)", "Reply to support…  (Enter to send, Shift+Enter for a new line)")}
          rows={2}
          disabled={replying}
          aria-label="Reply to support"
        />
        <div className="support-reply__actions">
          <label className="support-attach-button" title={t("Attach images (PNG, JPG, WebP up to 5 MB)", "Attach images (PNG, JPG, WebP up to 5 MB)")}>
            <ImageIcon size={16} />
            <span>{replyFiles.length ? t("{count} image(s)", "{count} image(s)").replace("{count}", String(replyFiles.length)) : t("Attach", "Attach")}</span>
            <input type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={(event) => {
              // Custom inline wrapper for pickImageFiles
              const all = Array.from(event.target.files ?? []);
              const valid = all.filter((file) => ALLOWED_IMAGE_TYPES.includes(file.type) && file.size <= MAX_ATTACHMENT_BYTES);
              const rejected = all.length - valid.length;
              const capped = valid.slice(0, MAX_ATTACHMENTS);
              let errorMsg: string | null = null;
              if (rejected > 0) errorMsg = t("Some files were skipped — only PNG, JPG, or WebP up to 5 MB are allowed.", "Some files were skipped — only PNG, JPG, or WebP up to 5 MB are allowed.");
              else if (valid.length > MAX_ATTACHMENTS) errorMsg = t("Only the first {max} images are attached.", "Only the first {max} images are attached.").replace("{max}", String(MAX_ATTACHMENTS));
              
              setReplyFiles(capped);
              onFileError(errorMsg);
            }} />
          </label>
          <button onClick={onReply} disabled={replying || (!reply.trim() && replyFiles.length === 0)} type="button" aria-label="Send reply" className="support-reply__send">
            {replying ? t("Sending…", "Sending…") : <Send size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message, sessionToken }: { message: SupportMessage | SupportChatMessage; sessionToken: string }) {
  const { t } = useLocalization();
  const own = message.senderType === "customer";
  const staffName = message.senderDisplayName || message.senderEmail;
  return (
    <div className={`support-message${own ? " support-message--own" : ""}`}>
      <div>
        <strong>
          {own ? t("You", "You") : staffName}
          {!own ? <span className="support-staff-badge">{t("Staff", "Staff")}</span> : null}
        </strong>
        <span>{formatDateTime(message.createdUtc)}</span>
      </div>
      <p>{message.body}</p>
      {"attachments" in message && message.attachments.length ? (
        <div className="support-attachments">
          {message.attachments.map((attachment) => <AttachmentPreview key={attachment.id} attachment={attachment} sessionToken={sessionToken} />)}
        </div>
      ) : null}
    </div>
  );
}

function AttachmentPreview({ attachment, sessionToken }: { attachment: SupportAttachment; sessionToken: string }) {
  const { t } = useLocalization();
  const [url, setUrl] = useState<string | null>(() => attachmentUrlCache.get(attachment.id) ?? null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const session = getCustomerSession();
    if (!session || !sessionToken) return;
    const cached = attachmentUrlCache.get(attachment.id);
    if (cached) {
      setUrl(cached);
      return;
    }
    let cancelled = false;
    getSupportAttachment(session, attachment.id)
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.blob();
      })
      .then((blob) => {
        if (cancelled) return;
        const objectUrl = URL.createObjectURL(blob);
        cacheAttachmentUrl(attachment.id, objectUrl);
        setUrl(objectUrl);
      })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [attachment.id, sessionToken]);
  if (failed) return <span>{t("{fileName} (unavailable)", "{fileName} (unavailable)").replace("{fileName}", attachment.fileName)}</span>;
  return url ? <img src={url} alt={attachment.fileName} /> : <span>{t("Loading {fileName}…", "Loading {fileName}…").replace("{fileName}", attachment.fileName)}</span>;
}

function SupportNavButton({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return <button className={active ? "is-active" : ""} onClick={onClick} type="button">{icon}<span>{label}</span></button>;
}

// Map standard tailwind tone to localized connection state label
function ConnectionBadge({ state }: { state: "disconnected" | "connecting" | "connected" }) {
  const { t } = useLocalization();
  const label = state === "connected"
    ? t("Connected", "Connected")
    : state === "connecting"
      ? t("Connecting", "Connecting")
      : t("Disconnected", "Disconnected");

  return <span className={`support-connection support-connection--${state}`}>{state === "connected" ? <Wifi size={14} /> : <WifiOff size={14} />}{label}</span>;
}

function CountRow({ label, value, tone }: { label: string; value: number; tone: string }) {
  return <div><span>{label}</span><strong className={`count-pill count-pill--${tone}`}>{value}</strong></div>;
}

function SupportListSkeleton() {
  return (
    <div className="support-skeleton" aria-hidden="true">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="support-skeleton__row">
          <span className="support-skeleton__pill" />
          <span className="support-skeleton__line" />
          <span className="support-skeleton__line support-skeleton__line--short" />
        </div>
      ))}
    </div>
  );
}

function mergeById<T extends { id: string }>(items: T[], item: T): T[] {
  const exists = items.some((current) => current.id === item.id);
  return exists ? items.map((current) => current.id === item.id ? item : current) : [...items, item];
}

function sortTickets(a: SupportTicket, b: SupportTicket) {
  return new Date(b.updatedUtc).getTime() - new Date(a.updatedUtc).getTime();
}
