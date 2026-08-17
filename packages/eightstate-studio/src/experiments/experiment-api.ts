export type ExperimentTargetType = 'agent' | 'workflow' | 'scorer';

export type StartExperimentInput = {
  datasetId: string;
  targetType: ExperimentTargetType;
  targetId: string;
  name?: string;
  description?: string;
  metadata?: Record<string, unknown>;
  scorers?: string[];
  version?: number;
  agentVersion?: string;
  maxConcurrency?: number;
  requestContext?: Record<string, unknown>;
};

export type StartedExperiment = {
  experimentId: string;
  status: 'pending';
  totalItems: number;
  rerunOf?: string;
};

export class ExperimentControlError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'ExperimentControlError';
  }
}

export function createExperimentApi(options: {
  baseUrl: string;
  headers: Record<string, string>;
}) {
  const root = `${options.baseUrl.replace(/\/$/, '')}/studio/experiments`;

  async function request(path: string, body?: unknown): Promise<unknown> {
    const response = await fetch(`${root}${path}`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        ...options.headers,
        ...(body === undefined ? {} : { 'content-type': 'application/json' }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const responseBody = await readBody(response);
    if (!response.ok) {
      const error = readError(responseBody);
      throw new ExperimentControlError(error.message ?? `Experiment request failed with HTTP ${response.status}`, response.status, error.code);
    }
    return responseBody;
  }

  return {
    start(input: StartExperimentInput): Promise<StartedExperiment> {
      const { datasetId, ...config } = input;
      return request(`/${encodeURIComponent(datasetId)}`, config) as Promise<StartedExperiment>;
    },
    cancel(datasetId: string, experimentId: string): Promise<{ experimentId: string; cancellationRequested: true }> {
      return request(`/${encodeURIComponent(datasetId)}/${encodeURIComponent(experimentId)}/cancel`) as Promise<{
        experimentId: string;
        cancellationRequested: true;
      }>;
    },
    rerun(datasetId: string, experimentId: string): Promise<StartedExperiment> {
      return request(`/${encodeURIComponent(datasetId)}/${encodeURIComponent(experimentId)}/rerun`, {}) as Promise<StartedExperiment>;
    },
  };
}

async function readBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    throw new ExperimentControlError('The experiment service returned invalid JSON', response.status);
  }
}

function readError(value: unknown): { code?: string; message?: string } {
  if (!isRecord(value) || !isRecord(value.error)) return {};
  return {
    ...(typeof value.error.code === 'string' ? { code: value.error.code } : {}),
    ...(typeof value.error.message === 'string' ? { message: value.error.message } : {}),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
