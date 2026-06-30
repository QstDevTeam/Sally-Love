'use strict';

/* ==========================================================================
   إعدادات عامة وثوابت
   ========================================================================== */

// تاريخ بداية القصة: 30/06/2026 الساعة 03:30 مساءً (15:30) بتوقيت المستخدم المحلي
const STORY_START_DATE = new Date(2026, 5, 30, 15, 30, 0);

const TOTAL_SCENES = 7; // 6 مشاهد + المشهد الأخير (للشريط التقدّمي نعتبر 6 خطوات رئيسية)

/* ==========================================================================
   أداة مساعدة: الانتقال بين المشاهد
   ========================================================================== */
const SceneManager = (() => {
  const scenes = Array.from(document.querySelectorAll('.scene'));
  const progressFill = document.getElementById('progress-fill');
  const progressTrack = document.querySelector('.progress-track');

  // ترتيب المشاهد لحساب نسبة التقدّم
  const sceneOrder = ['scene-1', 'scene-2', 'scene-3', 'scene-4', 'scene-5', 'scene-6', 'scene-final'];

  /**
   * الانتقال إلى مشهد معيّن بمعرّفه
   * @param {string} sceneId - معرف عنصر المشهد
   */
  function goTo(sceneId) {
    const target = document.getElementById(sceneId);
    if (!target) return;

    scenes.forEach((scene) => scene.classList.remove('active'));
    target.classList.add('active');

    updateProgress(sceneId);

    // إعادة المستخدم لأعلى الصفحة بسلاسة عند تغيير المشهد
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // تسجيل دخول المشهد في نظام التتبع (إن كان متاحاً)
    if (typeof VisitTracker !== 'undefined') {
      VisitTracker.logSceneEnter(sceneId);
    }

    // إطلاق حدث مخصص لتفعيل منطق كل مشهد عند ظهوره
    target.dispatchEvent(new CustomEvent('scene:enter'));
  }

  /**
   * تحديث شريط التقدّم العلوي بناءً على موقع المشهد الحالي
   * @param {string} sceneId
   */
  function updateProgress(sceneId) {
    const index = sceneOrder.indexOf(sceneId);
    if (index === -1) return;
    const percent = ((index + 1) / sceneOrder.length) * 100;
    progressFill.style.width = `${percent}%`;
    progressTrack.setAttribute('aria-valuenow', String(index + 1));
  }

  return { goTo };
})();

/* ==========================================================================
   خلفية النجوم المتحركة (Canvas - أداء عالٍ)
   ========================================================================== */
const StarsBackground = (() => {
  const canvas = document.getElementById('stars-canvas');
  const ctx = canvas.getContext('2d');
  let stars = [];
  let width = 0;
  let height = 0;
  let animationFrameId = null;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width * window.devicePixelRatio;
    canvas.height = height * window.devicePixelRatio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
    generateStars();
  }

  function generateStars() {
    // عدد النجوم متناسب مع مساحة الشاشة، بحد أقصى لمنع استهلاك الموارد
    const density = 0.00012;
    const count = Math.min(Math.floor(width * height * density), 160);
    stars = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.random() * 1.4 + 0.3,
      baseAlpha: Math.random() * 0.5 + 0.3,
      twinkleSpeed: Math.random() * 0.015 + 0.005,
      phase: Math.random() * Math.PI * 2,
    }));
  }

  function draw(time) {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#ffffff';

    stars.forEach((star) => {
      const twinkle = Math.sin(time * star.twinkleSpeed + star.phase);
      const alpha = star.baseAlpha + twinkle * 0.25;
      ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.globalAlpha = 1;
    animationFrameId = requestAnimationFrame(draw);
  }

  function init() {
    resize();
    window.addEventListener('resize', debounce(resize, 200));

    if (prefersReducedMotion) {
      // رسم النجوم مرة واحدة فقط بدون تحريك للأشخاص الذين يفضلون تقليل الحركة
      draw(0);
      return;
    }

    animationFrameId = requestAnimationFrame(draw);
  }

  return { init };
})();

/* ==========================================================================
   أداة Debounce عامة (لتحسين الأداء عند أحداث resize ونحوها)
   ========================================================================== */
function debounce(fn, delay) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/* ==========================================================================
   القلوب المتطايرة
   ========================================================================== */
const FloatingHearts = (() => {
  const container = document.getElementById('hearts-container');
  const heartSymbols = ['🤍', '💗', '💫'];
  let intervalId = null;

  /**
   * إنشاء قلب متطاير واحد في موضع عشوائي
   */
  function spawnHeart() {
    const heart = document.createElement('span');
    heart.className = 'floating-heart';
    heart.textContent = heartSymbols[Math.floor(Math.random() * heartSymbols.length)];

    const startX = Math.random() * 100;
    const duration = 6 + Math.random() * 5;
    const drift = (Math.random() - 0.5) * 120;
    const size = 1 + Math.random() * 1.2;

    heart.style.left = `${startX}vw`;
    heart.style.fontSize = `${size}rem`;
    heart.style.setProperty('--drift', `${drift}px`);
    heart.style.animationDuration = `${duration}s`;

    container.appendChild(heart);

    // تنظيف العنصر من DOM بعد انتهاء الأنيميشن لتفادي تسرب الذاكرة
    heart.addEventListener('animationend', () => heart.remove());
  }

  /**
   * بدء توليد القلوب بشكل دوري خفيف
   * @param {number} rateMs - الفاصل الزمني بين كل قلب
   */
  function start(rateMs = 1400) {
    stop();
    spawnHeart();
    intervalId = setInterval(spawnHeart, rateMs);
  }

  function stop() {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }

  /**
   * دفعة قلوب فورية (تستخدم في النهاية الاحتفالية)
   */
  function burst(count = 14) {
    for (let i = 0; i < count; i += 1) {
      setTimeout(spawnHeart, i * 90);
    }
  }

  return { start, stop, burst };
})();

/* ==========================================================================
   الكونفيتي الخفيف
   ========================================================================== */
const Confetti = (() => {
  const container = document.getElementById('confetti-container');
  const colors = ['#f472b6', '#fbbf24', '#ffffff', '#ec4899'];

  function spawnPiece(delay) {
    setTimeout(() => {
      const piece = document.createElement('span');
      piece.className = 'confetti-piece';

      const startX = Math.random() * 100;
      const driftX = (Math.random() - 0.5) * 200;
      const duration = 3 + Math.random() * 2.5;
      const color = colors[Math.floor(Math.random() * colors.length)];

      piece.style.left = `${startX}vw`;
      piece.style.background = color;
      piece.style.setProperty('--drift-x', `${driftX}px`);
      piece.style.animationDuration = `${duration}s`;

      container.appendChild(piece);
      piece.addEventListener('animationend', () => piece.remove());
    }, delay);
  }

  /**
   * إطلاق دفعة كونفيتي خفيفة وغير مزعجة
   * @param {number} count - عدد القطع
   */
  function launch(count = 40) {
    for (let i = 0; i < count; i += 1) {
      spawnPiece(i * 35);
    }
  }

  return { launch };
})();

/* ==========================================================================
   تأثير الـ Ripple على الأزرار
   ========================================================================== */
function attachRippleEffect(button) {
  button.addEventListener('click', (event) => {
    const rect = button.getBoundingClientRect();
    const ripple = document.createElement('span');
    const size = Math.max(rect.width, rect.height);

    ripple.className = 'ripple';
    ripple.style.width = `${size}px`;
    ripple.style.height = `${size}px`;
    ripple.style.left = `${event.clientX - rect.left - size / 2}px`;
    ripple.style.top = `${event.clientY - rect.top - size / 2}px`;

    button.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove());
  });
}

function initRippleButtons() {
  document.querySelectorAll('.btn').forEach(attachRippleEffect);
}

/* ==========================================================================
   التحكم بالموسيقى الخلفية
   ========================================================================== */
const MusicPlayer = (() => {
  const audio = document.getElementById('bg-music');
  const button = document.getElementById('music-toggle');
  const iconPlay = document.getElementById('music-icon-play');
  const iconPause = document.getElementById('music-icon-pause');
  let isPlaying = false;

  function updateIcon() {
    iconPlay.hidden = isPlaying;
    iconPause.hidden = !isPlaying;
    button.classList.toggle('playing', isPlaying);
    button.setAttribute('aria-pressed', String(isPlaying));
    button.setAttribute('aria-label', isPlaying ? 'إيقاف الموسيقى' : 'تشغيل الموسيقى');
  }

  function toggle() {
    if (isPlaying) {
      audio.pause();
      isPlaying = false;
      updateIcon();
      return;
    }

    // إذا لم يُضف ملف صوتي بعد، نمنع محاولة التشغيل لتفادي أي خطأ في الكونسول
    if (!audio.querySelector('source') && !audio.currentSrc) {
      button.classList.add('shake-hint');
      setTimeout(() => button.classList.remove('shake-hint'), 400);
      return;
    }

    audio.play().then(() => {
      isPlaying = true;
      updateIcon();
    }).catch(() => {
      // فشل التشغيل لسبب آخر (مثل قيود المتصفح) - لا نكسر الموقع
      isPlaying = false;
      updateIcon();
    });
  }

  function init() {
    button.addEventListener('click', toggle);
  }

  return { init };
})();

/* ==========================================================================
   المشهد 1: تأثير الكتابة
   ========================================================================== */
const Scene1 = (() => {
  const textEl = document.getElementById('typing-text');
  const nextBtn = document.getElementById('scene1-next');
  const lines = [
    'إلى الإنسانة التي غيّرت كل شيء...',
    'إلى قلبي...',
    'إلى ملكتي...',
    'سالي 🤍',
  ];

  let started = false;

  /**
   * كتابة سطر واحد حرفاً بحرف
   * @param {string} text
   * @returns {Promise<void>}
   */
  function typeLine(text) {
    return new Promise((resolve) => {
      let index = 0;
      textEl.textContent = '';
      const typeSpeed = 55;

      function typeChar() {
        if (index < text.length) {
          textEl.textContent += text.charAt(index);
          index += 1;
          setTimeout(typeChar, typeSpeed);
        } else {
          resolve();
        }
      }
      typeChar();
    });
  }

  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function playSequence() {
    for (let i = 0; i < lines.length; i += 1) {
      await typeLine(lines[i]);
      // وقت أطول بعد آخر سطر، أقصر بين الأسطر الوسيطة
      await wait(i === lines.length - 1 ? 800 : 1100);
    }
    nextBtn.hidden = false;
    nextBtn.focus();
  }

  function init() {
    nextBtn.addEventListener('click', () => SceneManager.goTo('scene-2'));

    if (!started) {
      started = true;
      playSequence();
    }
  }

  return { init };
})();

/* ==========================================================================
   المشهد 2: لعبة الإمساك بالقلب
   ========================================================================== */
const Scene2 = (() => {
  const gameArea = document.getElementById('heart-game-area');
  const heartBtn = document.getElementById('game-heart');
  const counterText = document.getElementById('scene2-counter');
  const messageEl = document.getElementById('scene2-message');
  const nextBtn = document.getElementById('scene2-next');
  const titleEl = document.getElementById('scene2-title');

  const REQUIRED_CLICKS = 5;
  let clicks = 0;
  let initialized = false;

  /**
   * نقل القلب إلى موضع عشوائي داخل منطقة اللعبة
   */
  function moveHeartRandomly() {
    const areaRect = gameArea.getBoundingClientRect();
    const heartSize = 60; // مساحة تقريبية للزر مع الحشو
    const maxX = Math.max(areaRect.width - heartSize, 10);
    const maxY = Math.max(areaRect.height - heartSize, 10);

    const x = Math.random() * maxX + heartSize / 2;
    const y = Math.random() * maxY + heartSize / 2;

    heartBtn.style.left = `${x}px`;
    heartBtn.style.top = `${y}px`;
  }

  function handleHeartClick() {
    if (clicks >= REQUIRED_CLICKS) return;

    clicks += 1;
    counterText.textContent = `اضغطي عليه (${clicks} / ${REQUIRED_CLICKS})`;
    FloatingHearts.burst(3);

    if (clicks >= REQUIRED_CLICKS) {
      completeGame();
    } else {
      moveHeartRandomly();
    }
  }

  function completeGame() {
    heartBtn.disabled = true;
    heartBtn.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
    heartBtn.style.opacity = '0';
    titleEl.textContent = 'أمسكتِ بقلبي! 🤍';
    messageEl.textContent = 'لكن الوصول إلى قلبي كان أسهل بكثير... لأنك أخذتيه من أول لحظة. ❤️';
    messageEl.hidden = false;
    nextBtn.hidden = false;

    if (typeof VisitTracker !== 'undefined') {
      VisitTracker.logEvent(`أكملت لعبة القلب (${REQUIRED_CLICKS} ضغطات)`);
    }
  }

  function resetGame() {
    clicks = 0;
    counterText.textContent = `اضغطي عليه (0 / ${REQUIRED_CLICKS})`;
    messageEl.hidden = true;
    nextBtn.hidden = true;
    heartBtn.disabled = false;
    heartBtn.style.opacity = '1';
    titleEl.textContent = 'حاولي الإمساك بقلبي 🤍';
    moveHeartRandomly();
  }

  function init() {
    nextBtn.addEventListener('click', () => SceneManager.goTo('scene-3'));

    if (!initialized) {
      initialized = true;
      heartBtn.addEventListener('click', handleHeartClick);
      heartBtn.addEventListener('touchstart', (e) => {
        // منع تسجيل النقرة مرتين على الأجهزة اللمسية
        e.preventDefault();
        handleHeartClick();
      }, { passive: false });
    }

    resetGame();
  }

  return { init };
})();

/* ==========================================================================
   المشهد 3: تخمين مقدار الحب
   ========================================================================== */
const Scene3 = (() => {
  const form = document.getElementById('guess-form');
  const input = document.getElementById('guess-input');
  const messageEl = document.getElementById('scene3-message');
  const nextBtn = document.getElementById('scene3-next');
  let initialized = false;

  function handleSubmit(event) {
    event.preventDefault();
    if (!input.value.trim()) {
      input.focus();
      return;
    }

    form.querySelector('button').disabled = true;
    input.disabled = true;
    messageEl.hidden = false;
    nextBtn.hidden = false;
    FloatingHearts.burst(8);

    if (typeof VisitTracker !== 'undefined') {
      VisitTracker.logEvent(`خمّنت مقدار الحب: "${input.value.trim()}"`);
    }
  }

  function reset() {
    input.value = '';
    input.disabled = false;
    form.querySelector('button').disabled = false;
    messageEl.hidden = true;
    nextBtn.hidden = true;
  }

  function init() {
    nextBtn.addEventListener('click', () => SceneManager.goTo('scene-4'));

    if (!initialized) {
      initialized = true;
      form.addEventListener('submit', handleSubmit);
    }

    reset();
  }

  return { init };
})();

/* ==========================================================================
   المشهد 4: الظروف الخمسة
   ========================================================================== */
const Scene4 = (() => {
  const grid = document.getElementById('envelopes-grid');
  const counterText = document.getElementById('scene4-counter');
  const nextBtn = document.getElementById('scene4-next');

  const messages = [
    'شكراً لأنك دخلتِ حياتي.',
    'وجودك جعل أيامي أجمل.',
    'ابتسامتك وحدها قادرة تغيّر يوم كامل.',
    'كل لحظة معك هي ذكرى جميلة.',
    'أحبك أكثر مما تستطيع الكلمات وصفه. 🤍',
  ];

  const TOTAL = messages.length;
  let openedCount = 0;
  let built = false;

  function buildEnvelopes() {
    grid.innerHTML = '';
    messages.forEach((message, index) => {
      const envelope = document.createElement('button');
      envelope.className = 'envelope';
      envelope.type = 'button';
      envelope.setAttribute('aria-label', `افتحي الظرف رقم ${index + 1}`);
      envelope.dataset.index = String(index);

      const icon = document.createElement('span');
      icon.className = 'envelope-icon';
      icon.textContent = '💌';
      icon.setAttribute('aria-hidden', 'true');

      const text = document.createElement('span');
      text.className = 'envelope-text';
      text.textContent = message;

      envelope.appendChild(icon);
      envelope.appendChild(text);
      envelope.addEventListener('click', () => openEnvelope(envelope));

      grid.appendChild(envelope);
    });
  }

  function openEnvelope(envelope) {
    if (envelope.classList.contains('opened')) return;

    envelope.classList.add('opened');
    openedCount += 1;
    counterText.textContent = `${openedCount} / ${TOTAL} ظروف مفتوحة`;
    FloatingHearts.burst(2);

    if (typeof VisitTracker !== 'undefined') {
      const index = Number(envelope.dataset.index) + 1;
      VisitTracker.logEvent(`فتحت الظرف رقم ${index}`);
    }

    if (openedCount === TOTAL) {
      nextBtn.hidden = false;
      if (typeof VisitTracker !== 'undefined') {
        VisitTracker.logEvent('فتحت كل الظروف الخمسة');
      }
    }
  }

  function reset() {
    openedCount = 0;
    counterText.textContent = `0 / ${TOTAL} ظروف مفتوحة`;
    nextBtn.hidden = true;
    if (!built) {
      buildEnvelopes();
      built = true;
    } else {
      grid.querySelectorAll('.envelope').forEach((env) => env.classList.remove('opened'));
    }
  }

  function init() {
    nextBtn.addEventListener('click', () => SceneManager.goTo('scene-5'));
    reset();
  }

  return { init };
})();

/* ==========================================================================
   منطق العداد الزمني (مشترك بين المشهد 5 والمشهد الأخير)
   ========================================================================== */
const CounterEngine = (() => {
  const SECOND = 1000;
  const MINUTE = 60 * SECOND;
  const HOUR = 60 * MINUTE;
  const DAY = 24 * HOUR;

  /**
   * حساب الفرق الزمني منذ تاريخ البداية وحتى الآن
   * @returns {{days:number, hours:number, minutes:number, seconds:number}}
   */
  function getElapsed() {
    const now = new Date();
    let diff = now.getTime() - STORY_START_DATE.getTime();

    // حماية: إذا كان التاريخ في المستقبل لأي سبب، لا نعرض أرقاماً سالبة
    if (diff < 0) diff = 0;

    const days = Math.floor(diff / DAY);
    const hours = Math.floor((diff % DAY) / HOUR);
    const minutes = Math.floor((diff % HOUR) / MINUTE);
    const seconds = Math.floor((diff % MINUTE) / SECOND);

    return { days, hours, minutes, seconds };
  }

  /**
   * ربط مجموعة عناصر DOM بالعداد وتحديثها كل ثانية
   * @param {{days:HTMLElement, hours:HTMLElement, minutes:HTMLElement, seconds:HTMLElement}} elements
   * @returns {number} معرّف الـ interval لإمكانية إيقافه لاحقاً
   */
  function bind(elements) {
    function update() {
      const { days, hours, minutes, seconds } = getElapsed();
      elements.days.textContent = String(days);
      elements.hours.textContent = String(hours).padStart(2, '0');
      elements.minutes.textContent = String(minutes).padStart(2, '0');
      elements.seconds.textContent = String(seconds).padStart(2, '0');
    }

    update();
    // نستخدم setInterval هنا حصراً لأنه عداد زمني حقيقي وليس أنيميشن بصري،
    // وهو الاستخدام الصحيح والموصى به لتحديثات تعتمد على الوقت الفعلي كل ثانية
    return setInterval(update, SECOND);
  }

  return { bind };
})();

/* ==========================================================================
   المشهد 5: العداد المباشر
   ========================================================================== */
const Scene5 = (() => {
  const nextBtn = document.getElementById('scene5-next');
  let intervalId = null;

  function init() {
    nextBtn.addEventListener('click', () => SceneManager.goTo('scene-6'));

    if (!intervalId) {
      intervalId = CounterEngine.bind({
        days: document.getElementById('days-1'),
        hours: document.getElementById('hours-1'),
        minutes: document.getElementById('minutes-1'),
        seconds: document.getElementById('seconds-1'),
      });
    }
  }

  return { init };
})();

/* ==========================================================================
   المشهد 6: أجمل شيء حدث لي
   ========================================================================== */
const Scene6 = (() => {
  const revealBtn = document.getElementById('scene6-reveal-btn');
  const answerEl = document.getElementById('scene6-answer');
  const nextBtn = document.getElementById('scene6-next');
  let initialized = false;

  function handleReveal() {
    revealBtn.hidden = true;
    answerEl.hidden = false;
    nextBtn.hidden = false;
    FloatingHearts.burst(10);

    if (typeof VisitTracker !== 'undefined') {
      VisitTracker.logEvent('ضغطت "اعرف" وشافت الإجابة');
    }
  }

  function reset() {
    revealBtn.hidden = false;
    answerEl.hidden = true;
    nextBtn.hidden = true;
  }

  function init() {
    nextBtn.addEventListener('click', () => SceneManager.goTo('scene-final'));

    if (!initialized) {
      initialized = true;
      revealBtn.addEventListener('click', handleReveal);
    }

    reset();
  }

  return { init };
})();

/* ==========================================================================
   المشهد الأخير: الرسالة الختامية
   ========================================================================== */
const SceneFinal = (() => {
  const finalLines = document.querySelectorAll('#final-text .fade-line');
  const finalTitle = document.getElementById('final-title');
  const finalDate = document.getElementById('final-date');
  const counterGrid2 = document.getElementById('counter-grid-2');
  const endingQuestion = document.getElementById('ending-question');
  const endingNoBtn = document.getElementById('ending-no-btn');
  const endingFinalLine = document.getElementById('ending-final-line');

  let played = false;
  let counterIntervalId = null;

  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function playSequence() {
    // عرض الأسطر النصية واحداً تلو الآخر
    for (let i = 0; i < finalLines.length; i += 1) {
      finalLines[i].style.animationDelay = '0s';
      finalLines[i].classList.add('fade-line');
      await wait(750);
    }

    await wait(400);

    // الكونفيتي والقلوب والتوهج
    Confetti.launch(45);
    FloatingHearts.burst(16);

    finalTitle.hidden = false;
    await wait(900);

    finalDate.hidden = false;
    await wait(700);

    counterGrid2.hidden = false;
    if (!counterIntervalId) {
      counterIntervalId = CounterEngine.bind({
        days: document.getElementById('days-2'),
        hours: document.getElementById('hours-2'),
        minutes: document.getElementById('minutes-2'),
        seconds: document.getElementById('seconds-2'),
      });
    }

    await wait(900);
    endingQuestion.hidden = false;
  }

  function handleEndingNo() {
    endingNoBtn.hidden = true;
    endingFinalLine.hidden = false;
    Confetti.launch(25);
    FloatingHearts.burst(12);

    if (typeof VisitTracker !== 'undefined') {
      VisitTracker.logEvent('ضغطت "لا..." في سؤال النهاية');
      VisitTracker.sendSummary(true);
    }
  }

  function init() {
    endingNoBtn.addEventListener('click', handleEndingNo);

    if (!played) {
      played = true;
      playSequence();
    }
  }

  return { init };
})();

/* ==========================================================================
   ربط كل مشهد بحدث الدخول إليه (Scene Lifecycle)
   ========================================================================== */
function bindSceneLifecycle() {
  document.getElementById('scene-1').addEventListener('scene:enter', Scene1.init);
  document.getElementById('scene-2').addEventListener('scene:enter', Scene2.init);
  document.getElementById('scene-3').addEventListener('scene:enter', Scene3.init);
  document.getElementById('scene-4').addEventListener('scene:enter', Scene4.init);
  document.getElementById('scene-5').addEventListener('scene:enter', Scene5.init);
  document.getElementById('scene-6').addEventListener('scene:enter', Scene6.init);
  document.getElementById('scene-final').addEventListener('scene:enter', SceneFinal.init);
}

/* ==========================================================================
   نقطة الدخول الرئيسية
   ========================================================================== */
function initApp() {
  StarsBackground.init();
  FloatingHearts.start(1600);
  MusicPlayer.init();
  initRippleButtons();
  bindSceneLifecycle();

  // بدء نظام التتبع وإرسال إشعار الدخول
  if (typeof VisitTracker !== 'undefined') {
    VisitTracker.init();
  }

  // تفعيل المشهد الأول يدوياً لأنه نشِط افتراضياً في HTML
  Scene1.init();
}

document.addEventListener('DOMContentLoaded', initApp);
