import http from 'node:http';

const port = Number(process.env.PORT || 8080);
const model = 'e2e-deterministic-model';
const defaultDelayMs = boundedDelay(process.env.DEFAULT_DELAY_MS || '0');

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);

  if (request.method === 'GET' && url.pathname === '/health') {
    return json(response, 200, { status: 'ready' });
  }

  if (request.method === 'GET' && url.pathname === '/v1/models') {
    return json(response, 200, {
      object: 'list',
      data: [{ id: model, object: 'model', created: 0, owned_by: 'eightstate-e2e' }],
    });
  }

  if (request.method === 'POST' && url.pathname === '/v1/chat/completions') {
    const body = await readJson(request);
    const delayMs = deterministicDelay(body);
    if (delayMs > 0) await delay(delayMs);
    const content = deterministicReply(body);

    if (body.stream === true) {
      response.writeHead(200, {
        'content-type': 'text/event-stream',
        'cache-control': 'no-cache',
        connection: 'keep-alive',
      });
      response.write(`data: ${JSON.stringify({
        id: 'chatcmpl-e2e',
        object: 'chat.completion.chunk',
        created: 0,
        model,
        choices: [{ index: 0, delta: { role: 'assistant', content }, finish_reason: null }],
      })}\n\n`);
      response.write(`data: ${JSON.stringify({
        id: 'chatcmpl-e2e',
        object: 'chat.completion.chunk',
        created: 0,
        model,
        choices: [{ index: 0, delta: {}, finish_reason: 'stop' }],
        usage: { prompt_tokens: 8, completion_tokens: 4, total_tokens: 12 },
      })}\n\n`);
      response.end('data: [DONE]\n\n');
      return;
    }

    return json(response, 200, {
      id: 'chatcmpl-e2e',
      object: 'chat.completion',
      created: 0,
      model,
      choices: [{ index: 0, message: { role: 'assistant', content }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 8, completion_tokens: 4, total_tokens: 12 },
    });
  }

  if (request.method === 'POST' && url.pathname === '/v1/responses') {
    await readJson(request);
    return json(response, 200, {
      id: 'resp_e2e',
      object: 'response',
      created_at: 0,
      status: 'completed',
      model,
      output: [
        {
          id: 'msg_e2e',
          type: 'message',
          role: 'assistant',
          status: 'completed',
          content: [{ type: 'output_text', text: 'Deterministic E2E response.', annotations: [] }],
        },
      ],
      usage: { input_tokens: 8, output_tokens: 4, total_tokens: 12 },
    });
  }

  // The clean runtime only needs a configured research gateway for readiness.
  // Returning an empty result keeps accidental research calls deterministic.
  if (request.method === 'POST' || request.method === 'GET') {
    return json(response, 200, { data: [], results: [], documents: [] });
  }

  return json(response, 404, { error: 'not_found' });
});

server.listen(port, '0.0.0.0', () => {
  process.stdout.write(`deterministic gateway listening on ${port}\n`);
});

function deterministicReply(body) {
  const contract = JSON.stringify(body);
  if (contract.includes('INSUFFICIENT_EVIDENCE') && contract.includes('NEEDS_CLARIFICATION')) {
    return JSON.stringify({
      status: 'INSUFFICIENT_EVIDENCE',
      answer: 'The deterministic local run completed without external evidence.',
      confidence: 0,
      citations: [],
    });
  }
  if (contract.includes('questionDefinition') && contract.includes('untrustedLeads')) {
    return JSON.stringify({
      questionDefinition: 'Verify the local EightState research-run contract.',
      terminology: ['EightState Studio', 'Contra Mini'],
      facets: ['public async API', 'dataset experiment lifecycle'],
      blindSpots: ['production model behavior'],
      sourceClasses: ['local runtime contract'],
      seedQueries: ['EightState Contra Mini local contract'],
      untrustedLeads: [],
    });
  }
  const messages = Array.isArray(body.messages) ? body.messages : [];
  const last = [...messages].reverse().find(message => message?.role === 'user');
  const raw = typeof last?.content === 'string' ? last.content : JSON.stringify(last?.content ?? '');
  return `Deterministic E2E response: ${raw.slice(0, 120)}`;
}

function deterministicDelay(body) {
  const match = JSON.stringify(body).match(/\[E2E_DELAY_MS=(\d{1,5})\]/u);
  return match ? boundedDelay(match[1]) : defaultDelayMs;
}

function delay(durationMs) {
  return new Promise(resolve => setTimeout(resolve, durationMs));
}

function boundedDelay(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, 15_000) : 0;
}

async function readJson(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString('utf8');
  return text ? JSON.parse(text) : {};
}

function json(response, status, body) {
  response.writeHead(status, { 'content-type': 'application/json' });
  response.end(JSON.stringify(body));
}
