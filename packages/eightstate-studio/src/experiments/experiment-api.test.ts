import { afterEach, describe, expect, it, vi } from 'vitest';
import { createExperimentApi, ExperimentControlError } from './experiment-api';

afterEach(() => vi.unstubAllGlobals());

describe('createExperimentApi', () => {
  it('starts a controlled Mastra experiment using the active Studio connection', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      experimentId: 'experiment-1',
      status: 'pending',
      totalItems: 2,
    }), { status: 202 }));
    vi.stubGlobal('fetch', fetchMock);

    const api = createExperimentApi({
      baseUrl: 'https://agents.example.test/',
      headers: { Authorization: 'Bearer studio-token' },
    });
    const result = await api.start({
      datasetId: 'dataset/1',
      targetType: 'workflow',
      targetId: 'contra-mini',
      scorers: ['accuracy'],
    });

    expect(result.experimentId).toBe('experiment-1');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://agents.example.test/studio/experiments/dataset%2F1',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer studio-token' }),
        body: JSON.stringify({ targetType: 'workflow', targetId: 'contra-mini', scorers: ['accuracy'] }),
      }),
    );
  });

  it('surfaces the server error used when an old experiment cannot be rerun faithfully', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      error: { code: 'EXPERIMENT_CONFIG_UNAVAILABLE', message: 'Start a new experiment from its dataset.' },
    }), { status: 409 })));

    const api = createExperimentApi({ baseUrl: 'http://localhost:4111', headers: {} });
    await expect(api.rerun('dataset-1', 'experiment-1')).rejects.toEqual(
      new ExperimentControlError('Start a new experiment from its dataset.', 409, 'EXPERIMENT_CONFIG_UNAVAILABLE'),
    );
  });
});
