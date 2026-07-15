import { apiRequest } from "./api-core";
import type {
  RegisterCustomerResponse,
  LoginResponse,
  GoogleAuthConfig,
  GoogleLoginResponse,
  ResendVerificationResponse,
  VerifyEmailResponse,
  ForgotPasswordResponse,
  ResetPasswordResponse,
} from "./api-types";

export function registerCustomer(payload: { email: string; password: string; username?: string; turnstileToken?: string; referralCode?: string; referralSource?: string }) {
  return apiRequest<RegisterCustomerResponse>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function loginCustomer(payload: { email: string; password: string }) {
  return apiRequest<LoginResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getGoogleAuthConfig() {
  return apiRequest<GoogleAuthConfig>("/api/auth/google/config");
}

export function loginCustomerWithGoogle(credential: string) {
  return apiRequest<GoogleLoginResponse>("/api/auth/google", {
    method: "POST",
    body: JSON.stringify({ credential }),
  });
}

export function resendVerificationEmail(payload: { email: string }) {
  return apiRequest<ResendVerificationResponse>("/api/auth/resend-verification", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function verifyEmailToken(token: string) {
  const query = new URLSearchParams({ token });
  return apiRequest<VerifyEmailResponse>(`/api/auth/verify-email?${query.toString()}`);
}

export function verifyEmailWithCode(payload: { email: string; code: string }) {
  return apiRequest<VerifyEmailResponse>("/api/auth/verify-email/code", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function requestPasswordReset(payload: { email: string }) {
  return apiRequest<ForgotPasswordResponse>("/api/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export type ResetPasswordPayload =
  | { token: string; password: string }
  | { email: string; code: string; password: string };

export function resetPassword(payload: ResetPasswordPayload) {
  return apiRequest<ResetPasswordResponse>("/api/auth/reset-password", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
