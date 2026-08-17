const baseUrl = required('E2E_BASE_URL').replace(/\/$/u, '');
const authorization = `Bearer ${required('E2E_API_KEY')}`;
let datasetId;

try {
  const suffix = Date.now();
  const dataset = await request('POST', '/api/datasets', {
    name: `Experiment lifecycle contract ${suffix}`,
    description: 'Disposable verification dataset',
  });
  datasetId = dataset.id;

  await request('POST', `/api/datasets/${encodeURIComponent(datasetId)}/items/batch`, {
    items: Array.from({ length: 12 }, (_, index) => ({
      input: `Lifecycle verification item ${index}`,
      groundTruth: 'Deterministic E2E response.',
    })),
  });

  const started = await request('POST', `/studio/experiments/${encodeURIComponent(datasetId)}`, {
    targetType: 'agent',
    targetId: 'contra-mini-scout',
    scorers: [],
    maxConcurrency: 1,
  });
  await waitForStatus(started.experimentId, ['pending', 'running']);
  await request('POST', experimentActionPath(started.experimentId, 'cancel'), {});
  await waitForStatus(started.experimentId, ['failed', 'completed']);

  const rerun = await request('POST', experimentActionPath(started.experimentId, 'rerun'), {});
  if (rerun.rerunOf !== started.experimentId || rerun.experimentId === started.experimentId) {
    throw new Error('rerun did not create a new experiment linked to the original');
  }
  await waitForStatus(rerun.experimentId, ['pending', 'running']);
  await request('POST', experimentActionPath(rerun.experimentId, 'cancel'), {});
  await waitForStatus(rerun.experimentId, ['failed', 'completed']);

  process.stdout.write(`experiment lifecycle verified: ${started.experimentId} -> ${rerun.experimentId}\n`);
} finally {
  if (datasetId) {
    await request('DELETE', `/api/datasets/${encodeURIComponent(datasetId)}`).catch(() => {});
  }
}

function experimentActionPath(experimentId, action) {
  return `/studio/experiments/${encodeURIComponent(datasetId)}/${encodeURIComponent(experimentId)}/${action}`;
}

async function waitForStatus(experimentId, expected) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    const experiment = await request(
      'GET',
      `/api/datasets/${encodeURIComponent(datasetId)}/experiments/${encodeURIComponent(experimentId)}`,
    );
    if (expected.includes(experiment.status)) return experiment;
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error(`experiment ${experimentId} did not reach ${expected.join(' or ')}`);
}

async function request(method, path, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      authorization,
      ...(body === undefined ? {} : { 'content-type': 'application/json' }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(10_000),
  });
  const text = await response.text();
  let parsed;
  try {
    parsed = text ? JSON.parse(text) : undefined;
  } catch {
    throw new Error(`${method} ${path} returned non-JSON HTTP ${response.status}`);
  }
  if (!response.ok) {
    throw new Error(`${method} ${path} returned HTTP ${response.status}: ${JSON.stringify(parsed)}`);
  }
  return parsed;
}

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}
