import { api } from "./api";
import type { MessageResponse, User } from "./types";

export type LoginPayload = {
  email: string;
  password: string;
};

export type RegisterPayload = {
  email: string;
  emailConfirmation: string;
  password: string;
  passwordConfirmation: string;
  name?: string;
};

export type ForgotPasswordPayload = {
  email: string;
};

export type ResetPasswordPayload = {
  token?: string;
  password: string;
  passwordConfirmation: string;
};

export type ResendVerificationPayload = {
  email?: string;
};

type VerifyEmailResponse = {
  message: string;
  user: User;
};

type AuthResponse = {
  token: string;
  user: User;
};

export const AuthService = {
  login(payload: LoginPayload) {
    return api<AuthResponse>("/auth/login", {
      method: "POST",
      auth: false,
      body: JSON.stringify(payload),
    });
  },
  register(payload: RegisterPayload) {
    return api<MessageResponse>("/auth/register", {
      method: "POST",
      auth: false,
      body: JSON.stringify(payload),
    });
  },
  verifyEmail(token: string) {
    return api<VerifyEmailResponse>(
      `/auth/verify-email?token=${encodeURIComponent(token)}`,
      {
        auth: false,
      },
    );
  },
  resendVerification(payload: ResendVerificationPayload) {
    return api<MessageResponse>("/auth/resend-verification", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  forgotPassword(payload: ForgotPasswordPayload) {
    return api<MessageResponse>("/auth/forgot-password", {
      method: "POST",
      auth: false,
      body: JSON.stringify(payload),
    });
  },
  resetPassword(payload: ResetPasswordPayload) {
    return api<MessageResponse>("/auth/reset-password", {
      method: "POST",
      auth: false,
      body: JSON.stringify(payload),
    });
  },
};
