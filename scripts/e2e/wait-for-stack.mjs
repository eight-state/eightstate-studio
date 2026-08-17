const baseUrl = required('E2E_BASE_URL').replace(/\/$/u, '');
const apiKey = required('E2E_API_KEY');
const deadline = Date.now() + Number(process.env.E2E_READY_TIMEOUT_MS || 180_000);
let lastError;

while (Date.now() < deadline) {
  try {
    await assertReady();
    process.stdout.write(`stack readiness verified at ${baseUrl}\n`);
    process.exit(0);
  } catch (error) {
    lastError = error;
    await new Promise(resolve => setTimeout(resolve, 2_000));
  }
}

throw new Error(`stack did not become ready: ${lastError instanceof Error ? lastError.message : String(lastError)}`);

async function assertReady() {
  const readinessResponse = await fetch(`${baseUrl}/readiness`, { signal: AbortSignal.timeout(5_000) });
  const readiness = await jsonBody(readinessResponse);
  if (!readinessResponse.ok) throw new Error(`/readiness returned ${readinessResponse.status}`);
  if (readiness.status !== 'ready') throw new Error(`/readiness status was ${readiness.status}`);
  if (readiness.storage !== 'postgres') throw new Error(`storage backend was ${readiness.storage}`);
  if (readiness.observability !== 'clickhouse') {
    throw new Error(`observability backend was ${readiness.observability}`);
  }
  for (const [name, ready] of Object.entries(readiness.checks || {})) {
    if (ready !== true) throw new Error(`readiness check ${name} failed`);
  }

  const anonymousResponse = await fetch(`${baseUrl}/api/agents`, { signal: AbortSignal.timeout(5_000) });
  if (anonymousResponse.status !== 401) {
    throw new Error(`anonymous /api/agents expected 401, got ${anonymousResponse.status}`);
  }

  const authenticatedResponse = await fetch(`${baseUrl}/api/agents`, {
    headers: { authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(5_000),
  });
  if (!authenticatedResponse.ok) {
    throw new Error(`authenticated /api/agents returned ${authenticatedResponse.status}`);
  }

  const datasetResponse = await fetch(`${baseUrl}/api/datasets`, {
    headers: { authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(5_000),
  });
  if (!datasetResponse.ok) throw new Error(`/api/datasets returned ${datasetResponse.status}`);

  const studioResponse = await fetch(baseUrl, { signal: AbortSignal.timeout(5_000) });
  const studioHtml = await studioResponse.text();
  if (!studioResponse.ok || !studioHtml.includes('<div id="root"></div>')) {
    throw new Error('Studio HTML was not served by the agent runtime');
  }
  if (studioHtml.includes('%%MASTRA_')) {
    throw new Error('Studio/server version mismatch left configuration placeholders unresolved');
  }

  const anonymousExperimentControl = await fetch(`${baseUrl}/studio/experiments/not-a-dataset`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{}',
    signal: AbortSignal.timeout(5_000),
  });
  if (anonymousExperimentControl.status !== 401) {
    throw new Error(`anonymous experiment controls expected 401, got ${anonymousExperimentControl.status}`);
  }

  const authenticatedExperimentControl = await fetch(`${baseUrl}/studio/experiments/not-a-dataset`, {
    method: 'POST',
    headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
    body: '{}',
    signal: AbortSignal.timeout(5_000),
  });
  if (authenticatedExperimentControl.status !== 400) {
    throw new Error(`authenticated experiment controls expected validation 400, got ${authenticatedExperimentControl.status}`);
  }
}

async function jsonBody(response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`${new URL(response.url).pathname} did not return JSON`);
  }
}

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}
