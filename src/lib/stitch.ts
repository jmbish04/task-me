const DEFAULT_STITCH_BASE_URL = "https://stitch.googleapis.com/mcp";

export type StitchDeviceType = "MOBILE" | "DESKTOP" | "TABLET" | "AGNOSTIC";
export type StitchModelId = "GEMINI_3_FLASH" | "GEMINI_3_PRO";

export type StitchToolDefinition = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
};

export const STITCH_TOOL_DEFINITIONS = [
  {
    name: "create_project",
    description: "Creates a Stitch project container.",
    parameters: {
      type: "object",
      properties: { title: { type: "string" } },
    },
  },
  {
    name: "generate_screen_from_text",
    description: "Generates a UI screen from a prompt.",
    parameters: {
      type: "object",
      properties: {
        projectId: { type: "string" },
        prompt: { type: "string" },
        deviceType: {
          type: "string",
          enum: ["MOBILE", "DESKTOP", "TABLET", "AGNOSTIC"],
        },
        modelId: { type: "string", enum: ["GEMINI_3_FLASH", "GEMINI_3_PRO"] },
      },
      required: ["projectId", "prompt"],
    },
  },
  {
    name: "get_screen",
    description: "Retrieves screen details.",
    parameters: {
      type: "object",
      properties: {
        projectId: { type: "string" },
        screenId: { type: "string" },
      },
      required: ["projectId", "screenId"],
    },
  },
  {
    name: "list_projects",
    description: "Lists all Stitch projects.",
    parameters: {
      type: "object",
      properties: { filter: { type: "string" } },
    },
  },
  {
    name: "list_screens",
    description: "Lists all screens within a project.",
    parameters: {
      type: "object",
      properties: { projectId: { type: "string" } },
      required: ["projectId"],
    },
  },
] as const satisfies readonly StitchToolDefinition[];

export type CreateProjectParams = {
  title: string;
};

export type GenerateScreenParams = {
  projectId: string;
  prompt: string;
  deviceType?: StitchDeviceType;
  modelId?: StitchModelId;
};

export type GetScreenParams = {
  projectId: string;
  screenId: string;
};

export type ListProjectsParams = {
  filter?: string;
};

export type ListScreensParams = {
  projectId: string;
};

export type StitchClientOptions = {
  apiKey: string;
  baseUrl?: string;
  fetcher?: typeof fetch;
};

export class StitchClient {
  private apiKey: string;
  private baseUrl: string;
  private fetcher: typeof fetch;

  constructor(options: StitchClientOptions) {
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl ?? DEFAULT_STITCH_BASE_URL;
    this.fetcher = options.fetcher ?? fetch;
  }

  async createProject(payload: CreateProjectParams) {
    return this.callTool("create_project", payload);
  }

  async generateScreenFromText(payload: GenerateScreenParams) {
    return this.callTool("generate_screen_from_text", payload);
  }

  async getScreen(payload: GetScreenParams) {
    return this.callTool("get_screen", payload);
  }

  async listProjects(payload: ListProjectsParams = {}) {
    return this.callTool("list_projects", payload);
  }

  async listScreens(payload: ListScreensParams) {
    return this.callTool("list_screens", payload);
  }

  private async callTool<TResponse>(
    toolName: string,
    parameters: Record<string, unknown>,
  ): Promise<TResponse> {
    const response = await this.fetcher(`${this.baseUrl}/tools/${toolName}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": this.apiKey,
      },
      body: JSON.stringify({ parameters }),
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(`Stitch error (${response.status}): ${message}`);
    }

    return (await response.json()) as TResponse;
  }
}

export const extractStitchImageUrl = (response: unknown) => {
  if (!response || typeof response !== "object") {
    return null;
  }
  const payload = response as Record<string, unknown>;
  return (
    (payload.imageUrl as string | undefined) ??
    (payload.image_url as string | undefined) ??
    (payload.url as string | undefined) ??
    (payload.screen as { imageUrl?: string } | undefined)?.imageUrl ??
    (payload.result as { imageUrl?: string } | undefined)?.imageUrl ??
    null
  );
};
