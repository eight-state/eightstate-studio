var baseUrl = E2E_BASE_URL.replace(/\/$/, '');
var headers = {
  authorization: 'Bearer ' + E2E_API_KEY,
  'content-type': 'application/json',
};
var suffix = String(Date.now());

var dataset = request('POST', '/api/datasets', {
  name: 'Maestro Experiment Lifecycle ' + suffix,
  description: 'Disposable dataset for real cancellation and rerun coverage.',
});

var items = [];
for (var index = 0; index < 25; index += 1) {
  items.push({
    input: 'Lifecycle item ' + index + ' for ' + suffix,
    groundTruth: 'Deterministic E2E response.',
  });
}
request('POST', '/api/datasets/' + dataset.id + '/items/batch', { items: items });

var experiment = request('POST', '/studio/experiments/' + dataset.id, {
  name: 'Cancellable run ' + suffix,
  targetType: 'agent',
  targetId: 'contra-mini-scout',
  scorers: [],
  maxConcurrency: 1,
});

output.datasetId = dataset.id;
output.experimentId = experiment.experimentId;

function request(method, path, body) {
  var response = http.request(baseUrl + path, {
    method: method,
    headers: headers,
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(method + ' ' + path + ' returned HTTP ' + response.status + ': ' + response.body);
  }
  return json(response.body);
}
