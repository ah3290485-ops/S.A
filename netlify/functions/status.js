import { getStore } from "@netlify/blobs";

export async function handler(event) {
  try {
    const id = event.queryStringParameters?.id;

    if (!id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ ok: false, error: "Missing id" })
      };
    }

    const store = getStore("requests");
    const data = await store.get(id, { type: "json" });

    if (!data) {
      return {
        statusCode: 404,
        body: JSON.stringify({ ok: false, error: "Not found" })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        status: data.status
      })
    };

  } catch (e) {
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: e.message })
    };
  }
}
