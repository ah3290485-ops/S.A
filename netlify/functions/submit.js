import { getStore } from "@netlify/blobs";

export async function handler(event) {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    const BOT_TOKEN = process.env.TG_BOT_TOKEN;
    const CHAT_ID = process.env.TG_CHAT_ID;
    const ADMIN_KEY = process.env.ADMIN_KEY;

    if (!BOT_TOKEN || !CHAT_ID || !ADMIN_KEY) {
      return { statusCode: 500, body: JSON.stringify({ ok:false, error:"Missing TG_BOT_TOKEN / TG_CHAT_ID / ADMIN_KEY" }) };
    }

    const body = JSON.parse(event.body || "{}");

    const name = (body.name || "").trim();
    const phone = (body.phone || "").trim();
    const jobTitle = (body.jobTitle || "").trim();
    const residence = (body.residence || "").trim();
    const workPlace = (body.workPlace || "").trim();
    const exp = (body.exp || "").trim();
    const notes = (body.notes || "").trim();
    const consent = !!body.consent;

    const certBase64 = body.certBase64 || "";
    const certMime = body.certMime || "";

    if (!consent) return { statusCode: 400, body: JSON.stringify({ ok:false, error:"Consent required" }) };
    if (!name || !phone || !jobTitle || !residence || !workPlace || !exp) {
      return { statusCode: 400, body: JSON.stringify({ ok:false, error:"Missing fields" }) };
    }
    if (!certBase64 || !certMime) {
      return { statusCode: 400, body: JSON.stringify({ ok:false, error:"Certificate image required" }) };
    }

    if (!["image/jpeg","image/png","image/webp"].includes(certMime)) {
      return { statusCode: 400, body: JSON.stringify({ ok:false, error:"Only JPG/PNG/WEBP allowed" }) };
    }

    const buffer = Buffer.from(certBase64, "base64");
    if (buffer.length > 2.2 * 1024 * 1024) {
      return { statusCode: 400, body: JSON.stringify({ ok:false, error:"Image too large. Please upload <= 2MB" }) };
    }

    // رقم طلب
    const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
    const requestId = `REQ-${suffix}`;
    const createdAt = new Date().toISOString();

    // تخزين الحالة (pending)
    const store = getStore("requests");
    await store.setJSON(requestId, {
      status: "pending",
      createdAt,
      name,
      phone,
      jobTitle,
      residence,
      workPlace,
      exp,
      notes
    });

    // روابط القبول/الرفض للأدمن
    const origin = (event.headers?.origin) || "";
    // إذا origin فاضي، روابط القبول/الرفض تظل شغالة لأنها ما تعتمد على origin (نتعامل معها لاحقاً).
    const acceptUrl = `${origin}/.netlify/functions/decision?id=${encodeURIComponent(requestId)}&action=accepted&key=${encodeURIComponent(ADMIN_KEY)}`;
    const rejectUrl = `${origin}/.netlify/functions/decision?id=${encodeURIComponent(requestId)}&action=rejected&key=${encodeURIComponent(ADMIN_KEY)}`;

    const caption =
`🇸🇦 طلب توظيف جديد (قيد المراجعة)
🆔 رقم الطلب: ${requestId}
👤 الاسم: ${name}
📱 رقم الجوال: ${phone}
💼 الوظيفة: ${jobTitle}
🏠 مكان السكن: ${residence}
📍 مكان الوظيفة المطلوبة: ${workPlace}
🧠 الخبرة: ${exp}
📝 ملاحظات: ${notes || "-"}
⏱️ الوقت: ${createdAt}

✅ قبول الطلب:
${acceptUrl}

❌ رفض الطلب:
${rejectUrl}

🔎 متابعة الحالة للمتقدم:
افتح status.html وحط رقم الطلب: ${requestId}`;

    // ارسال صورة + نص لتلغرام
    const form = new FormData();
    form.append("chat_id", CHAT_ID);
    form.append("caption", caption);

    const filename = certMime === "image/png" ? "certificate.png"
                   : certMime === "image/webp" ? "certificate.webp"
                   : "certificate.jpg";
    form.append("photo", new Blob([buffer], { type: certMime }), filename);

    const resp = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
      method: "POST",
      body: form
    });

    const data = await resp.json();
    if (!data.ok) {
      return { statusCode: 500, body: JSON.stringify({ ok:false, error:"Telegram send failed", details:data }) };
    }

    // رجّع رقم الطلب للواجهة
    return { statusCode: 200, body: JSON.stringify({ ok:true, requestId }) };

  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ ok:false, error:e.message }) };
  }
}
