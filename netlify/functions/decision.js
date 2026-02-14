import { getStore } from "@netlify/blobs";

export async function handler(event) {
  try {
    const qs = event.queryStringParameters || {};
    const id = (qs.id || "").trim();
    const action = (qs.action || "").trim(); // accepted | rejected
    const key = (qs.key || "").trim();

    const ADMIN_KEY = process.env.ADMIN_KEY;

    if (!ADMIN_KEY) {
      return { statusCode: 500, body: "Missing ADMIN_KEY" };
    }

    if (!id || !action || !key) {
      return { statusCode: 400, body: "Missing parameters" };
    }

    if (key !== ADMIN_KEY) {
      return { statusCode: 401, body: "Unauthorized" };
    }

    if (!["accepted", "rejected"].includes(action)) {
      return { statusCode: 400, body: "Invalid action" };
    }

    const store = getStore("requests");
    const data = await store.get(id, { type: "json" });

    if (!data) {
      return { statusCode: 404, body: "Request not found" };
    }

    // تحديث الحالة
    data.status = action;
    data.decidedAt = new Date().toISOString();
    await store.setJSON(id, data);

    // صفحة بسيطة للنتيجة
    const html = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>تم تحديث الطلب</title>
  <style>
    body{font-family:Tahoma;background:#0b0c10;color:#fff;margin:0;padding:24px}
    .card{max-width:680px;margin:auto;background:rgba(20,22,30,.92);border:1px solid rgba(255,255,255,.10);
      border-radius:18px;padding:18px}
    .ok{color:#bfffd2}
    .no{color:#ffd0d0}
    .id{opacity:.85}
    a{color:#d6b25e}
  </style>
</head>
<body>
  <div class="card">
    <h2 class="${action === "accepted" ? "ok" : "no"}">
      ${action === "accepted" ? "✅ تم قبول الطلب" : "❌ تم رفض الطلب"}
    </h2>
    <p class="id">رقم الطلب: <b>${id}</b></p>
    <p>المتقدم يقدر يشوف الحالة من صفحة: <b>status.html</b></p>
  </div>
</body>
</html>`;

    return {
      statusCode: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
      body: html
    };

  } catch (e) {
    return { statusCode: 500, body: "Error: " + e.message };
  }
}
