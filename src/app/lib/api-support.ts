import { apiRequest, apiBinaryRequest, withCustomerHeaders } from "./api-core";
import type { CustomerSession } from "./api-core";
import type {
  SupportAttachment,
  SupportMessage,
  SupportTicket,
  SupportOperationResponse,
  SupportChatMessage,
  SupportChatSession,
} from "./customer-api";

// ── Support tickets ─────────────────────────────────────────────────────────

export function getSupportTickets(session: CustomerSession) {
  return apiRequest<SupportTicket[]>("/api/customer/support/tickets", {
    headers: withCustomerHeaders(session),
  });
}

export function getSupportTicket(session: CustomerSession, ticketId: string) {
  return apiRequest<SupportTicket>(`/api/customer/support/tickets/${ticketId}`, {
    headers: withCustomerHeaders(session),
  });
}

export function createSupportTicket(session: CustomerSession, payload: { subject: string; message: string }) {
  return apiRequest<SupportOperationResponse>("/api/customer/support/tickets", {
    method: "POST",
    headers: withCustomerHeaders(session),
    body: JSON.stringify({
      Subject: payload.subject,
      Message: payload.message,
    }),
  });
}

export function replySupportTicket(session: CustomerSession, ticketId: string, body: string) {
  return apiRequest<SupportOperationResponse>(`/api/customer/support/tickets/${ticketId}/messages`, {
    method: "POST",
    headers: withCustomerHeaders(session),
    body: JSON.stringify({ Body: body }),
  });
}

export function closeSupportTicket(session: CustomerSession, ticketId: string) {
  return apiRequest<SupportOperationResponse>(`/api/customer/support/tickets/${ticketId}/close`, {
    method: "POST",
    headers: withCustomerHeaders(session),
  });
}

export function uploadSupportAttachment(session: CustomerSession, ticketId: string, messageId: string, file: File) {
  const form = new FormData();
  form.append("messageId", messageId);
  form.append("file", file);
  return apiRequest<{ success: boolean; message: string; attachment: SupportAttachment | null }>(`/api/customer/support/tickets/${ticketId}/attachments`, {
    method: "POST",
    headers: withCustomerHeaders(session),
    body: form,
  });
}

export function getSupportAttachment(session: CustomerSession, attachmentId: string) {
  return apiBinaryRequest(`/api/customer/support/attachments/${attachmentId}`, {
    headers: withCustomerHeaders(session),
  });
}

// ── Live chat ───────────────────────────────────────────────────────────────

export function startSupportChat(session: CustomerSession) {
  return apiRequest<SupportChatSession>("/api/customer/support/chat/start", {
    method: "POST",
    headers: withCustomerHeaders(session),
  });
}

export function closeSupportChat(session: CustomerSession, sessionId: string) {
  return apiRequest<{ success: boolean; message: string }>(`/api/customer/support/chat/${sessionId}/close`, {
    method: "POST",
    headers: withCustomerHeaders(session),
  });
}
