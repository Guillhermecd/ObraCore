import { api } from "./api";

type PresignedUrlResponse = {
  url: string;
};

export const StorageService = {
  getPresignedUrl(key: string) {
    return api<PresignedUrlResponse>(
      `/storage/presigned-url?key=${encodeURIComponent(key)}`,
    );
  },
};
