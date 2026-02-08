export type R2BucketLike = {
  put: (
    key: string,
    value: ArrayBuffer | ReadableStream | Blob,
    options?: {
      httpMetadata?: {
        contentType?: string;
      };
    },
  ) => Promise<unknown>;
};

export type R2Env = {
  TASK_ARTIFACTS?: R2BucketLike;
  R2_PUBLIC_BASE_URL?: string;
};

export type StoredMockup = {
  key: string;
  publicUrl: string | null;
};

const normalizeBaseUrl = (baseUrl?: string | null) => {
  if (!baseUrl) {
    return null;
  }
  return baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
};

export const buildR2PublicUrl = (baseUrl: string | null, key: string) => {
  if (!baseUrl) {
    return null;
  }
  return new URL(key, baseUrl).toString();
};

export const storeMockupInR2 = async (
  env: R2Env,
  imageUrl: string,
  keyPrefix: string,
): Promise<StoredMockup> => {
  if (!env.TASK_ARTIFACTS) {
    return { key: `${keyPrefix}/external`, publicUrl: imageUrl };
  }

  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch mockup image: ${response.status}`);
  }

  const contentType = response.headers.get("content-type") ?? "image/png";
  const key = `${keyPrefix}/${crypto.randomUUID()}`;

  await env.TASK_ARTIFACTS.put(key, await response.arrayBuffer(), {
    httpMetadata: { contentType },
  });

  const baseUrl = normalizeBaseUrl(env.R2_PUBLIC_BASE_URL);
  return {
    key,
    publicUrl: buildR2PublicUrl(baseUrl, key),
  };
};
