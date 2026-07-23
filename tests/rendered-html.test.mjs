import assert from "node:assert/strict";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    {
      ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("renders the live signal desk", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /Ricky 热点雷达/);
  assert.match(html, /少刷一点/);
  assert.match(html, /适合发 X/);
  assert.match(html, /class="x-score"/);
  assert.match(html, /class="x-reasons"/);
  assert.match(html, /中文热榜/);
  assert.match(html, /知乎热榜/);
  assert.match(html, /科技与 AI/);
  assert.match(html, /商业与财经/);
  assert.doesNotMatch(html, /<strong>0<small>/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/);

  const scores = [
    ...html.matchAll(/class="x-score" aria-label="适合发 X 评分 (\d+) 分"/g),
  ].map((match) => Number(match[1]));
  assert.ok(scores.length > 1);
  assert.deepEqual(scores, scores.toSorted((a, b) => b - a));
});
