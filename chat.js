// ═══════════════════════════════════════════════
//  chat.js  —  SmileCare Dental Frontend Logic
// ═══════════════════════════════════════════════

const SYSTEM = `
You are a premium AI dental receptionist for a luxury dental clinic.

Your personality:
- human-like, warm, intelligent, conversational, premium, friendly, confident, emotionally understanding, natural

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

let history  = [];
let isBusy   = false;
let leadStep = 'chat';
let leadName = '';
let leadPhone = '';

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

function addLeadCard(name, phone) {
  const row = document.createElement('div');
  row.className = 'mrow in';

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

window.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    addMsg('bot',
      'Namaste! 😊 SmileCare Dental Clinic mein aapka swagat hai!\n\nMain Denta hun — aapki receptionist. Daant se judi koi bhi problem ho, ya appointment book karni ho — main poori help karungi. Aaj kaise madad kar sakti hun?'
    );
    setQR(QR_WELCOME);
  }, 450);
});

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

async function submit(userText) {
  isBusy = true;
  btnEl().disabled = true;
  addMsg('user', userText);

  // Lead step: collect name
  if (leadStep === 'await_name') {
    if (userText.trim().length < 2) {
      showTyping(); await sleep(500); hideTyping();
      addMsg('bot', 'Thoda sa naam batayein — pehchaan ke liye zaroori hai 😊');
      isBusy = false; btnEl().disabled = false;
      return;
    }
    leadName = userText.trim();
    if (userText.includes(" ") && /^[A-Za-z ]+$/.test(userText)) {
      localStorage.setItem("lead_name", userText);
    }
    leadStep = 'await_phone';
    showTyping(); await sleep(750); hideTyping();
    addMsg('bot', `Shukriya ${leadName}! 😊\nAb apna WhatsApp number share karein — doctor aapko personally call karenge.`);
    isBusy = false; btnEl().disabled = false;
    return;
  }

  // Lead step: collect phone
  if (leadStep === 'await_phone') {
    const digits = userText.replace(/\D/g, '');
    if (digits.length < 9) {
      showTyping(); await sleep(500); hideTyping();
      addMsg('bot', 'Valid phone number chahiye — jaise 9876543210. Dobara try karein? 😊');
      isBusy = false; btnEl().disabled = false;
      return;
    }
    leadPhone = userText.trim();
    if (/^[6-9]\d{9}$/.test(userText)) {
      localStorage.setItem("lead_phone", userText);
    }
    leadStep = 'done';
    showTyping(); await sleep(900); hideTyping();
    addLeadCard(leadName, leadPhone);

    // Send email via EmailJS
    emailjs.send(
      "service_5urgjal",
      "template_sfnrvvr",
      {
        name:    leadName,
        phone:   leadPhone,
        message: "Appointment request",
        time:    new Date().toLocaleString()
      }
    )
    .then(() => console.log("Lead email sent ✅"))
    .catch(err => console.error("Email failed ❌", err));

    console.log('🦷 LEAD CAPTURED:', {
      name:  leadName,
      phone: leadPhone,
      time:  new Date().toLocaleString('en-IN'),
    });

    setQR(QR_END);
    isBusy = false; btnEl().disabled = false;
    return;
  }

  // Normal: Gemini call via /api/chat
  history.push({ role: 'user', parts: [{ text: userText }] });
  showTyping();

  try {
    let res;
    for (let i = 0; i < 3; i++) {
      res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ system: SYSTEM, history })
      });

      if (res.ok) break;

      if (res.status === 503 || res.status === 502 || res.status === 429) {
        console.log(`Retrying... Attempt ${i + 1}`);
        await sleep(2000);
        continue;
      }

      throw new Error(`HTTP ${res.status}`);
    }

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || `HTTP ${res.status}`);
    }

    const data = await res.json();
    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      data?.reply ||
      "Sorry, response nahi mila.";

    hideTyping();
    addMsg('bot', reply);
    history.push({ role: 'model', parts: [{ text: reply }] });

    // Detect name ask
    const lower = reply.toLowerCase();
    const asksName = lower.includes('naam') || lower.includes('name') || lower.includes('aapka naam');
    if (leadStep === 'chat' && asksName) {
      leadStep = 'await_name';
    }

    // Quick replies
    if (history.length <= 2) setQR(QR_WELCOME);
    else if (leadStep === 'chat') setQR(QR_MID);

  } catch (err) {
    hideTyping();
    history.pop();
    addMsg('bot', 'Server thoda busy hai 😅 Please 10-15 seconds baad fir try kariye.');
    console.error('Chat error:', err.message);
  }

  isBusy = false;
  btnEl().disabled = false;
}
