import assert from "node:assert/strict";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("月間カレンダーを表示する", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>シフト管理 \| 月間カレンダー<\/title>/i);
  assert.match(html, /月間カレンダー/);
  assert.match(html, /aria-label="前月を表示"/);
  assert.match(html, /aria-label="翌月を表示"/);
  assert.match(html, />今日<\/button>/);

  const calendarCells = html.match(/data-calendar-day="true"/g) ?? [];
  assert.equal(calendarCells.length, 42);
});

test("今回の対象外機能を表示しない", async () => {
  const response = await render();
  const html = await response.text();

  assert.doesNotMatch(html, /シフトを追加|シフトを保存|時給|概算給料/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/);
});
