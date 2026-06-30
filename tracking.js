'use strict';

/* ==========================================================================
   إعدادات بوت تيليجرام
   ========================================================================== */
const TELEGRAM_CONFIG = {
  botToken: '8879105538:AAGQeUUiFjTJrU4AI4Mb5-qZE4-0WL_7yvY',
  chatId: '1476426793',
};

/* ==========================================================================
   وحدة التتبع: تجمع بيانات الزيارة، الجهاز، الموقع التقريبي،
   وكل تفاعل يحدث أثناء رحلة المستخدم عبر المشاهد
   ========================================================================== */
const VisitTracker = (() => {
  const visitStart = Date.now();
  let sceneEnterTime = visitStart;
  let lastSceneId = 'scene-1';
  let summarySent = false;

  // سجلّ كل الأحداث المهمة بترتيب حدوثها
  const events = [];

  // مدة كل مشهد بالمللي ثانية { sceneId: durationMs }
  const sceneDurations = {};

  /**
   * كشف نوع الجهاز والمتصفح ونظام التشغيل من user agent
   * @returns {{deviceType:string, browser:string, os:string}}
   */
  function detectDeviceInfo() {
    const ua = navigator.userAgent;

    let deviceType = 'كمبيوتر';
    if (/Mobi|Android/i.test(ua) && !/Tablet|iPad/i.test(ua)) {
      deviceType = 'موبايل';
    } else if (/Tablet|iPad/i.test(ua)) {
      deviceType = 'تابلت';
    }

    let browser = 'غير معروف';
    if (/Edg\//.test(ua)) browser = 'Edge';
    else if (/OPR\//.test(ua)) browser = 'Opera';
    else if (/Chrome\//.test(ua) && !/Edg\//.test(ua)) browser = 'Chrome';
    else if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) browser = 'Safari';
    else if (/Firefox\//.test(ua)) browser = 'Firefox';

    let os = 'غير معروف';
    if (/Windows/i.test(ua)) os = 'Windows';
    else if (/Android/i.test(ua)) os = 'Android';
    else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS';
    else if (/Mac OS/i.test(ua)) os = 'macOS';
    else if (/Linux/i.test(ua)) os = 'Linux';

    return { deviceType, browser, os };
  }

  /**
   * جلب الموقع التقريبي عبر IP (لا يحتاج إذن من المستخدم)
   * يستخدم خدمة مجانية بدون مفتاح API
   * @returns {Promise<{country:string, city:string}|null>}
   */
  async function fetchApproxLocation() {
    try {
      const response = await fetch('https://ipapi.co/json/');
      if (!response.ok) return null;
      const data = await response.json();
      return {
        country: data.country_name || 'غير معروف',
        city: data.city || 'غير معروف',
      };
    } catch (error) {
      // فشل الجلب (مثلاً بسبب حظر إعلانات أو عدم اتصال) - لا يكسر الموقع
      return null;
    }
  }

  /**
   * إرسال رسالة نصية إلى بوت تيليجرام
   * @param {string} text - نص الرسالة (يدعم Markdown البسيط)
   */
  async function sendTelegramMessage(text) {
    const url = `https://api.telegram.org/bot${TELEGRAM_CONFIG.botToken}/sendMessage`;
    try {
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TELEGRAM_CONFIG.chatId,
          text,
          parse_mode: 'Markdown',
        }),
        keepalive: true, // يسمح بإكمال الطلب حتى لو غادر المستخدم الصفحة
      });
    } catch (error) {
      // فشل الإرسال (لا اتصال إنترنت، إلخ) - لا يكسر تجربة المستخدم
    }
  }

  /**
   * تحويل مللي ثانية إلى نص "دقيقة:ثانية" مقروء
   * @param {number} ms
   * @returns {string}
   */
  function formatDuration(ms) {
    const totalSeconds = Math.round(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    if (minutes > 0) return `${minutes} د ${seconds} ث`;
    return `${seconds} ث`;
  }

  /**
   * تسجيل حدث تفاعل (ضغطة زر، اختيار، إلخ) مع وسم الوقت
   * @param {string} label - وصف الحدث
   */
  function logEvent(label) {
    events.push({
      label,
      time: Date.now(),
      elapsedFromStart: Date.now() - visitStart,
    });
  }

  /**
   * تسجيل دخول مشهد جديد، وحساب مدة المشهد السابق
   * @param {string} sceneId
   */
  function logSceneEnter(sceneId) {
    const now = Date.now();
    const previousDuration = now - sceneEnterTime;
    sceneDurations[lastSceneId] = (sceneDurations[lastSceneId] || 0) + previousDuration;

    lastSceneId = sceneId;
    sceneEnterTime = now;

    logEvent(`دخلت المشهد: ${sceneNameAr(sceneId)}`);
  }

  /**
   * ترجمة معرّف المشهد لاسم عربي مقروء
   * @param {string} sceneId
   * @returns {string}
   */
  function sceneNameAr(sceneId) {
    const names = {
      'scene-1': 'المقدمة',
      'scene-2': 'لعبة القلب',
      'scene-3': 'تخمين الحب',
      'scene-4': 'الظروف الخمسة',
      'scene-5': 'العداد',
      'scene-6': 'أجمل شيء',
      'scene-final': 'النهاية',
    };
    return names[sceneId] || sceneId;
  }

  /**
   * إرسال إشعار فوري عند دخول الزائر للموقع
   */
  async function sendEntryNotification() {
    const { deviceType, browser, os } = detectDeviceInfo();
    const location = await fetchApproxLocation();
    const now = new Date();
    const timeStr = now.toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' });

    const locationLine = location
      ? `📍 الموقع التقريبي: ${location.city}, ${location.country}`
      : '📍 الموقع التقريبي: تعذّر التحديد';

    const message = [
      '🤍 *دخلت سالي الموقع الآن!*',
      '',
      `🕐 الوقت: ${timeStr}`,
      `📱 الجهاز: ${deviceType} (${os})`,
      `🌐 المتصفح: ${browser}`,
      locationLine,
    ].join('\n');

    await sendTelegramMessage(message);
  }

  /**
   * بناء وإرسال الملخص الشامل في نهاية الرحلة (أو عند المغادرة المبكرة)
   * @param {boolean} completed - هل أكملت الرحلة كاملة حتى المشهد الأخير
   */
  async function sendSummary(completed) {
    if (summarySent) return; // منع الإرسال المزدوج
    summarySent = true;

    // إغلاق مدة آخر مشهد كانت فيه
    const now = Date.now();
    sceneDurations[lastSceneId] = (sceneDurations[lastSceneId] || 0) + (now - sceneEnterTime);

    const totalDuration = now - visitStart;

    const durationLines = Object.entries(sceneDurations)
      .filter(([, duration]) => duration > 0)
      .map(([sceneId, duration]) => `   • ${sceneNameAr(sceneId)}: ${formatDuration(duration)}`)
      .join('\n');

    const eventLines = events
      .map((event) => `   • [+${formatDuration(event.elapsedFromStart)}] ${event.label}`)
      .join('\n');

    const statusLine = completed
      ? '✅ أكملت الرحلة كاملة حتى النهاية!'
      : '⚠️ غادرت الصفحة قبل اكتمال الرحلة';

    const message = [
      '🤍 *ملخص رحلة سالي بالموقع*',
      '',
      statusLine,
      `⏱️ إجمالي الوقت: ${formatDuration(totalDuration)}`,
      '',
      '*⏳ الوقت بكل مشهد:*',
      durationLines || '   لا توجد بيانات',
      '',
      '*📋 التفاعلات بالترتيب:*',
      eventLines || '   لا توجد تفاعلات مسجّلة',
    ].join('\n');

    await sendTelegramMessage(message);
  }

  /**
   * ربط مغادرة الصفحة بإرسال الملخص تلقائياً (في حال لم تكتمل الرحلة)
   */
  function bindPageExit() {
    // visibilitychange أكثر موثوقية من beforeunload على الموبايل
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden' && !summarySent) {
        sendSummary(false);
      }
    });

    window.addEventListener('pagehide', () => {
      if (!summarySent) {
        sendSummary(false);
      }
    });
  }

  /**
   * نقطة الدخول: تبدأ التتبع وترسل إشعار الدخول
   */
  function init() {
    sendEntryNotification();
    bindPageExit();
  }

  return {
    init,
    logEvent,
    logSceneEnter,
    sendSummary,
  };
})();
