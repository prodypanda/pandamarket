console.time('Populate Metrics Array');
// Simulate 1000 different endpoints (high cardinality) over many requests
const storeArray = [];
for (let i = 0; i < 50000; i++) {
  const method = i % 2 === 0 ? 'GET' : 'POST';
  const route = `/api/v1/resource/${Math.floor(Math.random() * 5000)}`;
  const status = i % 10 === 0 ? '500' : '200';

  const labels = { method, route, status };
  const key = JSON.stringify(labels);

  let c = storeArray.find((m) => JSON.stringify(m.labels) === key);
  if (!c) {
    c = { labels, value: 0 };
    storeArray.push(c);
  }
  c.value++;
}
console.timeEnd('Populate Metrics Array');
console.log('Store Array size:', storeArray.length);

console.time('Populate Metrics Map');
// Map implementation
const storeMap = new Map();
for (let i = 0; i < 50000; i++) {
  const method = i % 2 === 0 ? 'GET' : 'POST';
  const route = `/api/v1/resource/${Math.floor(Math.random() * 5000)}`;
  const status = i % 10 === 0 ? '500' : '200';

  const labels = { method, route, status };
  const key = JSON.stringify(labels);

  let c = storeMap.get(key);
  if (!c) {
    c = { labels, value: 0 };
    storeMap.set(key, c);
  }
  c.value++;
}
console.timeEnd('Populate Metrics Map');
console.log('Store Map size:', storeMap.size);
