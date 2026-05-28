// ═══════════════════════════════════════════════
//  chat.js  —  SmileCare Dental Frontend Logic
//
//  Yeh SINGLE chat.js use karna hai.
//  Gemini key yahan NAHI hai — Vercel env mein hai.
//  Yeh file sirf /api/chat ko call karta hai.
//
//  FILES STRUCTURE:
//    index.html       ← frontend UI
//    chat.js          ← yeh file (frontend logic)
//    api/
//      chat.js        ← backend (Vercel serverless)
// ═══════════════════════════════════════════════

// ── System Prompt ──────────────────────────────
const SYSTEM = `
You are a premium AI dental receptionist for a luxury dental clinic.

Your personality:
- human-like
- warm
- intelligent
- conversational
- premium
- friendly
- confident
- emotionally understanding
- natural

Your job:
- answer dental FAQs
- help patients book appointments
- collect patient details naturally
- ask follow-up questions
- sound like a real receptionist
- guide nervous patients calmly
- speak naturally in Hinglish
- never sound robotic

IMPORTANT APPOINTMENT FLOW:
If patient wants appointment:
1. Ask full name
2. Ask phone number
3. Ask dental issue
4. Ask preferred timing
5. Confirm politely

RULES:
- Keep replies short and smart
- Do NOT give robotic paragraphs
- Talk naturally like a receptionist
- Be engaging and premium
`;

// ── Quick Reply Sets ───────────────────────────
const QR_WELCOME = [
  "Book an appointment",
  "Daant mein dard hai",
  "Teeth whitening chahiye",
  "Services & prices",
  "Clinic timings",
];
const QR_MID = [
  "Price kya hoga?",
  "Kitna time lagega?",
  "Appointment book karni hai",
  "Doctor se baat karni hai",
];
const QR_END = [
  "Shukriya! 🙏",
  "Kuch aur poochhna hai",
  "Clinic ka address batao",
  "Call karein abhi",
];

// ── State ──────────────────────────────────────
let history   = [];          // Gemini conversation history
let isBusy    = false;       // prevent double sends
let leadStep  = 'chat';      // 'chat' | 'await_name' | 'await_phone' | 'done'
let leadName  = '';
let leadPhone = '';

// ── DOM Helpers ────────────────────────────────
const $      = id => document.getElementById(id);
const msgsEl = () => $('msgs');
const qrEl   = () => $('qr-strip');
const inpEl  = () => $('msg-input');
const btnEl  = () => $('send-btn');

function nowTime() {
  return new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 100) + 'px';
}
function scrollBottom() {
  const el = msgsEl();
  requestAnimationFrame(() => { el.scrollTop = el.scrollHeight; });
}

// ── Render: regular message ────────────────────
function addMsg(role, text) {
  const isBot = role === 'bot';
  const row   = document.createElement('div');
  row.className = `mrow ${isBot ? 'in' : 'out'}`;

  if (isBot) {
    const av = document.createElement('div');
    av.className = 'mav';
    av.textContent = '👩‍⚕️';
    row.appendChild(av);
  }

  const bub = document.createElement('div');
  bub.className = 'mbub';
  bub.innerHTML = text.replace(/\n/g, '<br/>');
  row.appendChild(bub);

  const t = document.createElement('span');
  t.className = 'mtime';
  t.textContent = nowTime();
  row.appendChild(t);

  if (!isBot) {
    const av = document.createElement('div');
    av.className = 'mav out-av';
    av.textContent = 'U';
    row.appendChild(av);
  }

  msgsEl().appendChild(row);
  scrollBottom();
}

// ── Render: lead confirmation card ────────────
function addLeadCard(name, phone) {
  const row = document.createElement('div');
  row.className = 'mrow in';
  row.style.animation = 'msg-in .3s ease both';

  const av = document.createElement('div');
  av.className = 'mav';
  av.textContent = '👩‍⚕️';

  const card = document.createElement('div');
  card.className = 'lead-card';
  card.innerHTML = `
    <div class="lead-card-title">✅ Appointment Request Received</div>
    <div class="lead-card-row">👤 <strong>${name}</strong></div>
    <div class="lead-card-row">📱 ${phone}</div>
    <div class="lead-card-row" style="margin-top:8px;font-size:12px;color:#15803d;">
      Hamari team aapko 24 ghante mein call karegi for confirmation.
    </div>
  `;

  row.appendChild(av);
  row.appendChild(card);
  msgsEl().appendChild(row);
  scrollBottom();
}

// ── Render: typing indicator ───────────────────
function showTyping() {
  const row = document.createElement('div');
  row.className = 'typing-row';
  row.id = 'typing-indicator';

  const av = document.createElement('div');
  av.className = 'mav';
  av.textContent = '👩‍⚕️';

  const bub = document.createElement('div');
  bub.className = 'typing-bub';
  bub.innerHTML = '<span></span><span></span><span></span>';

  row.appendChild(av);
  row.appendChild(bub);
  msgsEl().appendChild(row);
  scrollBottom();
}
function hideTyping() {
  const el = $('typing-indicator');
  if (el) el.remove();
}

// ── Render: quick reply buttons ────────────────
function setQR(list) {
  const el = qrEl();
  el.innerHTML = '';
  list.forEach(label => {
    const btn = document.createElement('button');
    btn.className = 'qr';
    btn.textContent = label;
    btn.onclick = () => { el.innerHTML = ''; submit(label); };
    el.appendChild(btn);
  });
}

// ── Init: welcome message ──────────────────────
window.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    addMsg('bot',
      'Namaste! 😊 SmileCare Dental Clinic mein aapka swagat hai!\n\nMain Denta hun — aapki receptionist. Daant se judi koi bhi problem ho, ya appointment book karni ho — main poori help karungi. Aaj kaise madad kar sakti hun?'
    );
    setQR(QR_WELCOME);
  }, 450);
});

// ── Send: from button or Enter ─────────────────
function send() {
  const val = inpEl().value.trim();
  if (!val || isBusy) return;
  inpEl().value = '';
  inpEl().style.height = 'auto';
  qrEl().innerHTML = '';
  submit(val);
}
function handleKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
}

// ── Core: submit a message ─────────────────────
async function submit(userText) {
  isBusy = true;
  btnEl().disabled = true;
  addMsg('user', userText);

  // ── Lead step: collect name ──
  if (leadStep === 'await_name') {
    if (userText.trim().length < 2) {
      showTyping(); await sleep(500); hideTyping();
      addMsg('bot', 'Thoda sa naam batayein — pehchaan ke liye zaroori hai 😊');
      isBusy = false; btnEl().disabled = false;
      return;
    }
    leadName = userText.trim();
    // Save patient name
if (
  userText.includes(" ") &&
  /^[A-Za-z ]+$/.test(userText)
) {
  localStorage.setItem("lead_name", userText);
}
    leadStep = 'await_phone';
    showTyping(); await sleep(750); hideTyping();
    addMsg('bot', `Shukriya ${leadName}! 😊\nAb apna WhatsApp number share karein — doctor aapko personally call karenge.`);
    isBusy = false; btnEl().disabled = false;
    return;
  }

  // ── Lead step: collect phone ──
  if (leadStep === 'await_phone') {
    const digits = userText.replace(/\D/g, '');
    if (digits.length < 9) {
      showTyping(); await sleep(500); hideTyping();
      addMsg('bot', 'Valid phone number chahiye — jaise 9876543210. Dobara try karein? 😊');
      isBusy = false; btnEl().disabled = false;
      return;
    }
    leadPhone = userText.trim();
    // Save phone number
if (/^[6-9]\d{9}$/.test(userText)) {
  localStorage.setItem("lead_phone", userText);
}
    leadStep  = 'done';
    showTyping(); await sleep(900); hideTyping();
    addLeadCard(leadName, leadPhone);
    setQR(QR_END);
    // ── Log lead (replace with webhook in production) ──
    console.log('🦷 LEAD CAPTURED:', {
      name:  leadName,
      phone: leadPhone,
      time:  new Date().toLocaleString('en-IN'),
    });
    isBusy = false; btnEl().disabled = false;
    return;
  }

  // ── Normal: Gemini call via /api/chat ──
  history.push({ role: 'user', parts: [{ text: userText }] });
  showTyping();

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ system: SYSTEM, history }),
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || `HTTP ${res.status}`);
    }

    const { reply } = await res.json();
    if (!reply) throw new Error('Empty response');

    hideTyping();
    addMsg('bot', reply);
    history.push({ role: 'model', parts: [{ text: reply }] });
    // ===== EMAIL LEAD SYSTEM =====

if (
  userText.toLowerCase().includes("appointment") ||
  userText.toLowerCase().includes("book") ||
  userText.toLowerCase().includes("call") ||
  userText.toLowerCase().includes("doctor")
) {

  emailjs.send(
    "service_5urgjal",
  "template_sfnrvvr",
  {
    name: localStorage.getItem("lead_name") || userText,
    
    phone: localStorage.getItem("lead_phone") || userText,
    
    message: userText,
    
    time: new Date().toLocaleString()
  }
)
.then(() => {
  console.log("Lead email sent ✅");
})
.catch((err) => {
  console.error("Email failed ❌", err);
});
}

    // ── Detect name-ask in bot reply → trigger lead flow ──
    const lower = reply.toLowerCase();
    const asksName = lower.includes('naam') || lower.includes('name') || lower.includes('aapka naam');
    if (leadStep === 'chat' && asksName) {
      leadStep = 'await_name';
    }

    // Show contextual quick replies
    if (history.length <= 2) setQR(QR_WELCOME);
    else if (leadStep === 'chat') setQR(QR_MID);

  } catch (err) {
    hideTyping();
    history.pop(); // rollback failed message
    addMsg('bot', 'Kuch technical issue aa gaya 😅 Kripya dobara try karein.\nYa seedha call karein: 📞 +91 98765 43210');
    console.error('Chat error:', err.message);
  }

  isBusy = false;
  btnEl().disabled = false;
}
