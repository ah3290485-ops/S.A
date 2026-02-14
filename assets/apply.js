const msg = document.querySelector("#msg");
const form = document.querySelector("#form");
const preview = document.querySelector("#preview");
const certInput = document.querySelector("#cert");

function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[m]));
}

function setMsg(text, ok=false){
  msg.innerHTML = `<div class="notice ${ok ? 'ok' : ''}">${escapeHtml(text)}</div>`;
}

// تعبئة الوظيفة من الرابط
const url = new URL(location.href);
const jobFromUrl = url.searchParams.get("job");
if (jobFromUrl) document.querySelector("#jobTitle").value = jobFromUrl;

let certBase64 = "";
let certMime = "";

certInput.addEventListener("change", async () => {
  const file = certInput.files?.[0];
  certBase64 = ""; 
  certMime = "";
  preview.innerHTML = "ارفع صورة واضحة وبحجم أقل من 2MB.";

  if (!file) return;

  if (file.size > 2.2 * 1024 * 1024) {
    certInput.value = "";
    return setMsg("حجم الصورة كبير. ارفع صورة أقل من 2MB.", false);
  }

  certMime = file.type || "image/jpeg";
  const dataUrl = await readAsDataURL(file);

  const commaIndex = dataUrl.indexOf(",");
  certBase64 = commaIndex >= 0 ? dataUrl.slice(commaIndex + 1) : dataUrl;

  preview.innerHTML = `
    ✅ تم اختيار الملف: ${escapeHtml(file.name)} (${Math.round(file.size/1024)}KB)
    <img src="${dataUrl}" alt="preview">
  `;
});

form.addEventListener("submit", async (e)=>{
  e.preventDefault();

  const payload = {
    jobTitle: document.querySelector("#jobTitle").value.trim(),
    name: document.querySelector("#name").value.trim(),
    phone: document.querySelector("#phone").value.trim(),
    residence: document.querySelector("#residence").value.trim(),
    workPlace: document.querySelector("#workPlace").value.trim(),
    exp: document.querySelector("#exp").value.trim(),
    notes: document.querySelector("#notes").value.trim(),
    consent: document.querySelector("#consent").checked,
    certBase64,
    certMime
  };

  if (!payload.certBase64) {
    return setMsg("لازم ترفع صورة شهادة الدراسة.", false);
  }

  try{
    setMsg("جالس نرسل طلبك…", true);

    const res = await fetch("/.netlify/functions/submit", {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json().catch(()=>({}));
    if (!res.ok) throw new Error(data.error || "فشل الإرسال");

    setMsg(`✅ تم استلام طلبك بنجاح
🆔 رقم الطلب: ${data.requestId}
احتفظ بالرقم لمتابعة الحالة`, true);

    form.reset();
    preview.innerHTML = "ارفع صورة واضحة وبحجم أقل من 2MB.";
    certBase64 = "";
    certMime = "";

    form.insertAdjacentHTML("beforeend", `
      <a class="btn ghost" href="status.html" style="margin-top:10px">
        🔎 متابعة حالة الطلب
      </a>
    `);

  }catch(err){
    setMsg("صار خطأ: " + err.message, false);
  }
});

function readAsDataURL(file){
  return new Promise((resolve, reject)=>{
    const r = new FileReader();
    r.onload = ()=>resolve(r.result);
    r.onerror = ()=>reject(new Error("File read failed"));
    r.readAsDataURL(file);
  });
}
