import { api } from "./api";
import type { MessageResponse, User } from "./types";

export type UpdateProfilePayload = {
  name: string;
};

export type UpdateEmailPayload = {
  email: string;
  emailConfirmation: string;
};

export type ChangePasswordPayload = {
  currentPassword: string;
  password: string;
  passwordConfirmation: string;
};

type UserResponse = {
  user: User;
};

export const ProfileService = {
  getProfile() {
    return api<UserResponse>("/profile");
  },
  updateProfile(payload: UpdateProfilePayload) {
    return api<UserResponse>("/profile", {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },
  updateEmail(payload: UpdateEmailPayload) {
    return api<UserResponse>("/profile/email", {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },
  changePassword(payload: ChangePasswordPayload) {
    return api<MessageResponse>("/profile/password", {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },
  uploadImage(file: File) {
    const formData = new FormData();
    formData.append("file", file);

    return api<UserResponse>("/profile/image", {
      method: "POST",
      body: formData,
    });
  },
};
