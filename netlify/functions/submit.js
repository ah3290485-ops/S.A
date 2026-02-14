let requests = {};

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405 };
  }

  try {
    const data = JSON.parse(event.body);

    const requestId = Date.now().toString();

    requests[requestId] = {
      status: "pending",
      data
    };

    const message = `
طلب جديد 📨
🆔 رقم الطلب: ${requestId}

الوظيفة: ${data.jobTitle}
الاسم: ${data.name}
الجوال: ${data.phone}
السكن: ${data.residence}
مكان الوظيفة: ${data.workPlace}
الخبرة: ${data.exp}
    `;

    await fetch(`https://api.telegram.org/bot${process.env.TG_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: process.env.TG_CHAT_ID,
        text: message
      })
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ requestId })
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
