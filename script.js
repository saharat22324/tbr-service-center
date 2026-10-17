"use strict";

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
const motionOn = document.documentElement.classList.contains("js");
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const formatNumber = (value) => Math.round(value).toLocaleString("en-US");

/* header, progress, mobile menu */
const header = $(".site-header");
const progressBar = $(".scroll-progress");
const menuToggle = $(".menu-toggle");
const navigation = $("#navigation");
let scrollFrame = 0;

function updateScroll() {
  scrollFrame = 0;
  const max = document.documentElement.scrollHeight - window.innerHeight;
  progressBar.style.setProperty("--p", max > 0 ? Math.min(window.scrollY / max, 1) : 0);
  header.classList.toggle("is-scrolled", window.scrollY > 30);
}
window.addEventListener("scroll", () => {
  if (!scrollFrame) scrollFrame = requestAnimationFrame(updateScroll);
}, { passive: true });
updateScroll();

function closeMenu() {
  menuToggle.setAttribute("aria-expanded", "false");
  navigation.classList.remove("is-open");
}
menuToggle.addEventListener("click", () => {
  const open = menuToggle.getAttribute("aria-expanded") === "true";
  menuToggle.setAttribute("aria-expanded", String(!open));
  navigation.classList.toggle("is-open", !open);
});
navigation.addEventListener("click", (event) => {
  if (event.target.closest("a")) closeMenu();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && menuToggle.getAttribute("aria-expanded") === "true") {
    closeMenu();
    menuToggle.focus();
  }
});

/* count-up numbers */
function animateCount(element, target) {
  const duration = 1500;
  const start = performance.now();
  function step(now) {
    const t = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - t, 4);
    element.textContent = formatNumber(target * eased);
    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

/* reveal on scroll + counters */
if (motionOn) {
  $$(".rv").forEach((item) => {
    const siblings = [...item.parentElement.children].filter((el) => el.classList.contains("rv"));
    item.style.setProperty("--d", `${(siblings.indexOf(item) % 4) * 0.09}s`);
  });
  $$(".check-list li").forEach((item, index) => item.style.setProperty("--d", `${0.15 + index * 0.07}s`));

  const counters = $$("[data-count]");
  counters.forEach((el) => {
    const text = el.textContent.trim();
    const digits = text.replace(/\D/g, "").length;
    el.style.minWidth = `${digits + (text.length - digits) * 0.4}ch`;
    el.textContent = "0";
  });
  const countObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        animateCount(entry.target, Number(entry.target.dataset.count));
        countObserver.unobserve(entry.target);
      }
    }
  }, { threshold: 0.4 });
  counters.forEach((el) => countObserver.observe(el));

  const revealObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add("in");
        revealObserver.unobserve(entry.target);
      }
    }
  }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
  $$(".rv").forEach((item) => revealObserver.observe(item));
}

/* pointer effects */
const hero = $(".hero");
if (!reduceMotion && canHover) {
  hero.addEventListener("pointermove", (event) => {
    const box = hero.getBoundingClientRect();
    hero.style.setProperty("--px", ((event.clientX - box.left) / box.width - 0.5) * 2);
    hero.style.setProperty("--py", ((event.clientY - box.top) / box.height - 0.5) * 2);
  });
  hero.addEventListener("pointerleave", () => {
    hero.style.setProperty("--px", 0);
    hero.style.setProperty("--py", 0);
  });

  $$(".tilt").forEach((card) => {
    card.addEventListener("pointermove", (event) => {
      const box = card.getBoundingClientRect();
      const x = event.clientX - box.left;
      const y = event.clientY - box.top;
      card.style.setProperty("--mx", `${x}px`);
      card.style.setProperty("--my", `${y}px`);
      card.style.setProperty("--ry", `${((x / box.width) - 0.5) * 7}deg`);
      card.style.setProperty("--rx", `${(0.5 - (y / box.height)) * 7}deg`);
    });
    card.addEventListener("pointerleave", () => {
      card.style.setProperty("--rx", "0deg");
      card.style.setProperty("--ry", "0deg");
    });
  });

  const glow = $(".cursor-glow");
  let glowFrame = 0;
  let glowX = 0;
  let glowY = 0;
  document.addEventListener("pointermove", (event) => {
    glowX = event.clientX;
    glowY = event.clientY;
    glow.classList.add("on");
    if (!glowFrame) {
      glowFrame = requestAnimationFrame(() => {
        glow.style.transform = `translate3d(${glowX}px,${glowY}px,0)`;
        glowFrame = 0;
      });
    }
  }, { passive: true });
  document.addEventListener("pointerleave", () => glow.classList.remove("on"));
}

/* hero sparks */
(function startSparks() {
  const canvas = $(".hero-sparks");
  if (reduceMotion || !canvas) return;
  const ctx = canvas.getContext("2d");
  let width = 0;
  let height = 0;
  let particles = [];
  let frameId = 0;
  let heroVisible = true;

  const make = (anywhere) => ({
    x: Math.random() * width,
    y: anywhere ? Math.random() * height : height + 10,
    r: Math.random() * 2 + 0.6,
    vy: -(Math.random() * 0.9 + 0.3),
    vx: (Math.random() - 0.5) * 0.5,
    phase: Math.random() * Math.PI * 2,
    hue: Math.random() < 0.72 ? 42 : 8,
  });

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const box = canvas.getBoundingClientRect();
    width = box.width;
    height = box.height;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.round(Math.min(90, Math.max(28, width / 16)));
    while (particles.length < count) particles.push(make(true));
    particles.length = count;
  }

  function frame() {
    ctx.clearRect(0, 0, width, height);
    ctx.globalCompositeOperation = "lighter";
    for (const p of particles) {
      p.phase += 0.03;
      p.x += p.vx + Math.sin(p.phase) * 0.3;
      p.y += p.vy;
      if (p.y < -12) Object.assign(p, make(false));
      const alpha = 0.3 + 0.5 * Math.abs(Math.sin(p.phase));
      const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 5);
      gradient.addColorStop(0, `hsla(${p.hue},100%,66%,${alpha})`);
      gradient.addColorStop(1, `hsla(${p.hue},100%,50%,0)`);
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 5, 0, Math.PI * 2);
      ctx.fill();
    }
    frameId = requestAnimationFrame(frame);
  }

  function sync() {
    const shouldRun = heroVisible && !document.hidden;
    if (shouldRun && !frameId) frameId = requestAnimationFrame(frame);
    if (!shouldRun && frameId) { cancelAnimationFrame(frameId); frameId = 0; }
  }

  resize();
  window.addEventListener("resize", resize);
  document.addEventListener("visibilitychange", sync);
  new IntersectionObserver(([entry]) => { heroVisible = entry.isIntersecting; sync(); }).observe(hero);
  sync();
})();

/* open / closed status (Asia/Bangkok, Tue–Sun 09:00–18:00) */
function updateOpenStatus() {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Bangkok", weekday: "short", hour: "numeric", minute: "numeric", hourCycle: "h23" }).formatToParts(new Date());
  const get = (type) => parts.find((p) => p.type === type).value;
  const day = get("weekday");
  const minutes = Number(get("hour")) * 60 + Number(get("minute"));
  const openAt = 9 * 60;
  const closeAt = 18 * 60;
  let state = "closed";
  let text;
  if (day === "Mon") {
    text = "วันนี้ร้านหยุด · เปิดอีกครั้งวันอังคาร 09.00 น.";
  } else if (minutes >= openAt && minutes < closeAt) {
    state = "open";
    text = "เปิดให้บริการตอนนี้ · ปิด 18.00 น.";
  } else if (minutes < openAt) {
    text = "ยังไม่เปิด · เปิดวันนี้ 09.00 น.";
  } else {
    text = day === "Sun" ? "ปิดแล้ว · พรุ่งนี้ร้านหยุด เปิดวันอังคาร 09.00 น." : "ปิดแล้ว · เปิดอีกครั้งพรุ่งนี้ 09.00 น.";
  }
  $$("[data-open-status]").forEach((box) => {
    box.dataset.state = state;
    $("[data-open-text]", box).textContent = text;
  });
}
updateOpenStatus();
setInterval(updateOpenStatus, 60000);

/* oil price calculator */
const oilForm = $("#oil-calc");
const oilPrice = $("#oil-price .num");
const oilCta = $("#oil-cta");
let shownPrice = 0;
let priceFrame = 0;

function tweenPrice(target) {
  cancelAnimationFrame(priceFrame);
  if (reduceMotion) {
    shownPrice = target;
    oilPrice.textContent = formatNumber(target);
    return;
  }
  const from = shownPrice || target;
  const start = performance.now();
  function step(now) {
    const t = Math.min((now - start) / 600, 1);
    shownPrice = from + (target - from) * (1 - Math.pow(1 - t, 3));
    oilPrice.textContent = formatNumber(t === 1 ? target : shownPrice);
    if (t < 1) priceFrame = requestAnimationFrame(step);
  }
  priceFrame = requestAnimationFrame(step);
}

function updateOil() {
  const car = oilForm.elements.car.value;
  const checked = $("input[name=car]:checked", oilForm);
  const withFlush = oilForm.elements.mode.value === "flush";
  const price = Number(withFlush ? checked.dataset.flush : checked.dataset.plain);
  tweenPrice(price);
  $("#oil-price-sr").textContent = `ราคาโปรโมชัน ${formatNumber(price)} บาท`;
  oilCta.dataset.service = withFlush ? "เปลี่ยนน้ำมันเครื่อง + ฟลัชชิ่งเครื่องยนต์" : "เปลี่ยนน้ำมันเครื่อง";
  oilCta.dataset.detail = `ประเภทรถ: ${car} · ราคาโปรโมชันที่เห็นบนเว็บ ${formatNumber(price)} บาท`;
}
oilForm.addEventListener("change", updateOil);
updateOil();

/* appointment form */
const form = $("#appointment-form");
const serviceSelect = $("#service");
const detailsField = $("#details");
const result = $("#message-result");
const preview = $("#message-preview");
const statusBox = $("#form-status");
const copyButton = $("#copy-message");
const phoneInput = $("#customer-phone");
let lastAutoDetail = "";

function showStatus(message, isError = false) {
  statusBox.textContent = message;
  statusBox.classList.toggle("is-error", isError);
}
function invalidateMessage() {
  result.hidden = true;
  preview.value = "";
  showStatus("");
}

$$("[data-service]").forEach((link) => {
  link.addEventListener("click", () => {
    const service = link.dataset.service;
    if ([...serviceSelect.options].some((option) => option.value === service)) serviceSelect.value = service;
    const detail = link.dataset.detail || "";
    if (!detailsField.value.trim() || detailsField.value === lastAutoDetail) {
      detailsField.value = detail;
      lastAutoDetail = detail;
    }
    invalidateMessage();
  });
});

form.addEventListener("input", (event) => {
  event.target.setCustomValidity("");
  event.target.classList.remove("is-invalid");
  invalidateMessage();
});
form.addEventListener("change", invalidateMessage);

form.addEventListener("submit", (event) => {
  event.preventDefault();
  for (const field of $$("[required]", form)) {
    if (!field.value.trim()) field.setCustomValidity("กรุณากรอกข้อมูลในช่องนี้ (ไม่ใช้เฉพาะช่องว่าง)");
  }
  const digits = phoneInput.value.replace(/\D/g, "");
  if (phoneInput.value.trim() && (digits.length < 9 || digits.length > 15 || /[^\d+\s()\-]/.test(phoneInput.value))) {
    phoneInput.setCustomValidity("กรุณากรอกเบอร์โทร 9–15 หลักที่ติดต่อได้");
  }
  if (!form.checkValidity()) {
    $$(":invalid", form).forEach((field) => field.classList.add("is-invalid"));
    form.reportValidity();
    return;
  }

  const data = new FormData(form);
  const value = (name) => String(data.get(name) || "").trim();
  preview.value = [
    "สวัสดีครับ/ค่ะ TBR Top Bull Race Service Center",
    "ต้องการสอบถาม / ขอคิวบริการ",
    `ชื่อ: ${value("customerName")}`,
    `เบอร์โทร: ${value("phone")}`,
    `รถ: ${value("carModel")}`,
    `บริการที่สนใจ: ${value("service")}`,
    `วันเวลาที่สะดวก: ${value("preferredTime") || "ขอปรึกษากับอู่ (ร้านหยุดวันจันทร์)"}`,
    `รายละเอียด: ${value("details") || "ขอปรึกษารายละเอียดเพิ่มเติม"}`,
    "กรุณายืนยันราคา รายการที่รวม VAT และความเหมาะสมกับรุ่นรถ",
    "เข้าใจว่านี่เป็นคำขอนัดหมาย ต้องรออู่ยืนยันคิวก่อน",
  ].join("\n");
  result.hidden = false;
  showStatus("เตรียมข้อความแล้ว ยังไม่ได้ส่งให้อู่ กรุณาคัดลอกแล้วนำไปส่งใน LINE");
  preview.focus();
});

copyButton.addEventListener("click", async () => {
  if (!navigator.clipboard || !window.isSecureContext) {
    preview.focus();
    preview.select();
    showStatus("เบราว์เซอร์นี้ไม่อนุญาตให้คัดลอกอัตโนมัติ กรุณาคัดลอกข้อความที่เลือกด้วยตัวเอง", true);
    return;
  }
  copyButton.disabled = true;
  try {
    await navigator.clipboard.writeText(preview.value);
    showStatus("คัดลอกแล้ว เปิด LINE วางข้อความและกดส่งเอง ทางอู่ยังไม่ได้รับคำขอจากเว็บไซต์");
  } catch (error) {
    console.error("Unable to copy appointment message:", error);
    preview.focus();
    preview.select();
    showStatus("คัดลอกไม่สำเร็จ กรุณาคัดลอกข้อความที่เลือกด้วยตัวเอง แล้วนำไปส่งใน LINE", true);
  } finally {
    copyButton.disabled = false;
  }
});

/* poster lightbox */
const lightbox = $("#lightbox");
const lightboxImage = $("#lb-img");
$$("[data-lightbox]").forEach((button) => {
  button.addEventListener("click", () => {
    if (typeof lightbox.showModal !== "function") {
      window.open(button.dataset.lightbox, "_blank", "noopener");
      return;
    }
    lightboxImage.src = button.dataset.lightbox;
    lightboxImage.alt = button.dataset.caption;
    $("#lb-cap").textContent = button.dataset.caption;
    lightbox.showModal();
  });
});
$(".lb-close").addEventListener("click", () => lightbox.close());
lightbox.addEventListener("click", (event) => {
  if (event.target === lightbox) lightbox.close();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && lightbox.open) lightbox.close();
});

/* ===== showpiece layer ===== */
const backTop = $(".back-top-ring");
let extraFrame = 0;
function updateExtras() {
  extraFrame = 0;
  const max = document.documentElement.scrollHeight - window.innerHeight;
  const y = window.scrollY;
  backTop.style.setProperty("--bp", max > 0 ? Math.min(y / max, 1) * 100 : 0);
  backTop.classList.toggle("show", y > 700);
  if (!reduceMotion && y < 1400) hero.style.setProperty("--sy", (y * 0.18).toFixed(1));
}
window.addEventListener("scroll", () => {
  if (!extraFrame) extraFrame = requestAnimationFrame(updateExtras);
}, { passive: true });
updateExtras();
backTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" }));

if (!reduceMotion) {
  /* click bursts */
  const fx = document.createElement("canvas");
  fx.className = "fx-canvas";
  fx.setAttribute("aria-hidden", "true");
  document.body.append(fx);
  const fxCtx = fx.getContext("2d");
  let sparks = [];
  let fxFrame = 0;

  function fxResize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    fx.width = Math.round(window.innerWidth * dpr);
    fx.height = Math.round(window.innerHeight * dpr);
    fxCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  fxResize();
  window.addEventListener("resize", fxResize);

  function fxStep() {
    fxCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    fxCtx.globalCompositeOperation = "lighter";
    for (const s of sparks) {
      s.vy += 0.16;
      s.vx *= 0.99;
      s.x += s.vx;
      s.y += s.vy;
      s.life -= 0.022;
      const g = fxCtx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 4);
      g.addColorStop(0, `hsla(${s.h},100%,65%,${Math.max(s.life, 0)})`);
      g.addColorStop(1, `hsla(${s.h},100%,50%,0)`);
      fxCtx.fillStyle = g;
      fxCtx.beginPath();
      fxCtx.arc(s.x, s.y, s.r * 4, 0, Math.PI * 2);
      fxCtx.fill();
    }
    sparks = sparks.filter((s) => s.life > 0);
    if (sparks.length) {
      fxFrame = requestAnimationFrame(fxStep);
    } else {
      fxFrame = 0;
      fxCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    }
  }

  function burst(x, y, count) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 5 + 2;
      sparks.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 2, life: 1, r: Math.random() * 2 + 0.9, h: Math.random() < 0.7 ? 42 : 6 });
    }
    if (!fxFrame) fxFrame = requestAnimationFrame(fxStep);
  }

  document.addEventListener("pointerdown", (event) => {
    const target = event.target.closest(".btn-red,.btn-gold,.btn-line,.header-call,.float-line,.mobile-actions a,.emblem");
    if (target) burst(event.clientX, event.clientY, target.matches(".emblem") ? 55 : 24);
  });

  /* tap the emblem to rev the gauge */
  const emblem = $(".emblem");
  let revTimer = 0;
  emblem.addEventListener("click", () => {
    emblem.classList.remove("rev");
    void emblem.offsetWidth;
    emblem.classList.add("rev");
    clearTimeout(revTimer);
    revTimer = setTimeout(() => emblem.classList.remove("rev"), 1450);
  });

  if (canHover) {
    /* cursor ring */
    const ring = $(".cursor-ring");
    let rx = 0;
    let ry = 0;
    let tx = 0;
    let ty = 0;
    let ringFrame = 0;
    function ringStep() {
      rx += (tx - rx) * 0.2;
      ry += (ty - ry) * 0.2;
      ring.style.transform = `translate3d(${rx}px,${ry}px,0)`;
      ringFrame = Math.abs(tx - rx) + Math.abs(ty - ry) > 0.3 ? requestAnimationFrame(ringStep) : 0;
    }
    document.addEventListener("pointermove", (event) => {
      tx = event.clientX;
      ty = event.clientY;
      ring.classList.add("on");
      ring.classList.toggle("hot", Boolean(event.target.closest("a,button,label,.chip,.tilt,summary")));
      if (!ringFrame) ringFrame = requestAnimationFrame(ringStep);
    }, { passive: true });
    document.addEventListener("pointerleave", () => ring.classList.remove("on"));

    /* magnetic buttons */
    $$(".btn,.header-call,.float-line").forEach((el) => {
      el.addEventListener("pointermove", (event) => {
        const box = el.getBoundingClientRect();
        el.style.setProperty("--tx", `${((event.clientX - box.left - box.width / 2) * 0.22).toFixed(1)}px`);
        el.style.setProperty("--ty", `${((event.clientY - box.top - box.height / 2) * 0.3).toFixed(1)}px`);
      });
      el.addEventListener("pointerleave", () => {
        el.style.removeProperty("--tx");
        el.style.removeProperty("--ty");
      });
    });
  }
}
