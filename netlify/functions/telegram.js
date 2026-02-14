export async function handler(event) {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    const BOT_TOKEN = process.env.TG_BOT_TOKEN;
    const CHAT_ID = process.env.TG_CHAT_ID;

    if (!BOT_TOKEN || !CHAT_ID) {
      return { statusCode: 500, body: JSON.stringify({ ok:false, error:"Missing TG_BOT_TOKEN or TG_CHAT_ID" }) };
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

    const when = new Date().toISOString();
    const caption =
`🇸🇦 طلب توظيف جديد
👤 الاسم: ${name}
📱 رقم الجوال: ${phone}
💼 الوظيفة: ${jobTitle}
🏠 مكان السكن: ${residence}
📍 مكان الوظيفة المطلوبة: ${workPlace}
🧠 الخبرة: ${exp}
📝 ملاحظات: ${notes || "-"}
⏱️ الوقت: ${when}`;

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

    return { statusCode: 200, body: JSON.stringify({ ok:true }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ ok:false, error:e.message }) };
  }
}
