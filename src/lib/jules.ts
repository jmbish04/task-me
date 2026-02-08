export type JulesPayload = {
  repoUrl: string;
  taskDescription: string;
  mockupUrl?: string | null;
};

export type JulesResult = {
  ok: boolean;
  status: string;
  requestId?: string;
};

export type JulesOptions = {
  apiUrl?: string;
  fetcher?: typeof fetch;
};

const DEFAULT_JULES_API_URL = "https://jules.withgoogle/api/requests";

export const delegateToJules = async (
  payload: JulesPayload,
  options: JulesOptions = {},
): Promise<JulesResult> => {
  const apiUrl = options.apiUrl ?? DEFAULT_JULES_API_URL;
  const fetcher = options.fetcher ?? fetch;

  try {
    const response = await fetcher(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const message = await response.text();
      return { ok: false, status: `error:${response.status}:${message}` };
    }

    const data = (await response.json()) as { requestId?: string };
    return { ok: true, status: "submitted", requestId: data.requestId };
  } catch (error) {
    return {
      ok: false,
      status: `mocked:${error instanceof Error ? error.message : "unknown"}`,
    };
  }
};
