module.exports = async function checkLocalization(data) {
  const violations = [];
  const passed = [];

  try {
    const { html = '', requests = [] } = data;
    const htmlLower = html.toLowerCase();

    const FORBIDDEN = [
      {
        id: 'google-analytics-detected',
        patterns: ['google-analytics.com', 'googletagmanager.com', 'gtag/js', 'analytics.google.com'],
        htmlMarkers: ['gtag(', "ga('", 'ua-'],
        severity: 'critical',
        law: '152-ФЗ / 242-ФЗ (локализация ПД)',
        article: 'ст. 13.11 ч.9 КоАП РФ',
        title: 'Обнаружен Google Analytics',
        description: 'На сайте подключён Google Analytics, который передаёт данные посетителей (IP-адрес, поведение) на серверы Google в США. С 01.07.2025 это прямое нарушение закона о локализации персональных данных.',
        fine_min: 100000,
        fine_max: 6000000,
        how_to_fix: 'Удалите Google Analytics и замените на Яндекс.Метрику (metrika.yandex.ru). Подключение занимает около 10 минут и бесплатно.'
      },
      {
        id: 'meta-pixel-detected',
        patterns: ['connect.facebook.net', 'facebook.com/tr', 'fbevents.js'],
        htmlMarkers: ['fbq(', 'facebook-pixel'],
        severity: 'critical',
        law: '152-ФЗ / 242-ФЗ + запрет Meta',
        article: 'ст. 13.11 ч.9 КоАП РФ',
        title: 'Обнаружен Meta Pixel (Facebook)',
        description: 'На сайте установлен пиксель Meta (Facebook), которая признана в России экстремистской организацией. Это нарушение локализации ПД плюс риск уголовной ответственности.',
        fine_min: 100000,
        fine_max: 6000000,
        how_to_fix: 'Немедленно удалите Meta Pixel. Замените на VK Pixel (vk.com/adscabinet) для ретаргетинга.'
      },
      {
        id: 'google-recaptcha-detected',
        patterns: ['www.google.com/recaptcha', 'recaptcha/api.js'],
        htmlMarkers: ['grecaptcha', 'recaptcha'],
        severity: 'critical',
        law: '152-ФЗ / 242-ФЗ',
        article: 'ст. 13.11 ч.9 КоАП РФ',
        title: 'Обнаружена Google reCAPTCHA',
        description: 'Google reCAPTCHA передаёт IP-адрес пользователя и поведенческие данные на серверы Google — трансграничная передача персональных данных.',
        fine_min: 100000,
        fine_max: 6000000,
        how_to_fix: 'Замените на Яндекс SmartCaptcha (cloud.yandex.ru/services/smartcaptcha). Интеграция аналогична reCAPTCHA.'
      },
      {
        id: 'google-fonts-cdn-detected',
        patterns: ['fonts.googleapis.com', 'fonts.gstatic.com'],
        htmlMarkers: ['fonts.googleapis.com'],
        severity: 'warning',
        law: '152-ФЗ',
        article: 'ст. 13.11 ч.1 КоАП РФ',
        title: 'Google Fonts загружаются с CDN Google',
        description: 'Шрифты подключены с серверов Google. При загрузке браузер отправляет IP-адрес пользователя в Google — это передача персональных данных за рубеж.',
        fine_min: 150000,
        fine_max: 300000,
        how_to_fix: 'Скачайте шрифты и разместите их на своём сервере (self-hosted). Используйте google-webfonts-helper для получения файлов и готового CSS.'
      },
      {
        id: 'tiktok-analytics-detected',
        patterns: ['analytics.tiktok.com', 'business-api.tiktok.com'],
        htmlMarkers: ['ttq.', 'tiktok-pixel'],
        severity: 'critical',
        law: '152-ФЗ / 242-ФЗ',
        article: 'ст. 13.11 ч.9 КоАП РФ',
        title: 'Обнаружена аналитика TikTok',
        description: 'На сайте установлен пиксель TikTok, который передаёт данные о поведении пользователей на зарубежные серверы — нарушение требований локализации ПД.',
        fine_min: 100000,
        fine_max: 6000000,
        how_to_fix: 'Удалите TikTok Pixel. Для ретаргетинга используйте VK Pixel или Яндекс.Аудитории.'
      },
      {
        id: 'hotjar-detected',
        patterns: ['static.hotjar.com', 'hotjar.com'],
        htmlMarkers: ['hotjar', 'hj('],
        severity: 'critical',
        law: '152-ФЗ / 242-ФЗ',
        article: 'ст. 13.11 ч.9 КоАП РФ',
        title: 'Обнаружен Hotjar',
        description: 'Hotjar записывает движения мыши и скроллинг пользователей и передаёт данные на серверы в Ирландии — нарушение локализации ПД.',
        fine_min: 100000,
        fine_max: 6000000,
        how_to_fix: 'Удалите Hotjar. Базовую тепловую карту предоставляет Яндекс.Метрика бесплатно.'
      },
      {
        id: 'linkedin-tag-detected',
        patterns: ['snap.licdn.com', 'linkedin.com/px'],
        htmlMarkers: ['_linkedin_data_partner', 'linkedin-insight'],
        severity: 'critical',
        law: '152-ФЗ / 242-ФЗ',
        article: 'ст. 13.11 ч.9 КоАП РФ',
        title: 'Обнаружен LinkedIn Insight Tag',
        description: 'LinkedIn Insight Tag передаёт данные о посетителях на серверы Microsoft в США. LinkedIn заблокирован в России с 2016 года.',
        fine_min: 100000,
        fine_max: 6000000,
        how_to_fix: 'Удалите LinkedIn Insight Tag со всех страниц сайта.'
      }
    ];

    let foundAny = false;
    for (const svc of FORBIDDEN) {
      const inReq = svc.patterns.some(p => requests.some(r => r.includes(p)));
      const inHtml = svc.htmlMarkers.some(m => htmlLower.includes(m.toLowerCase()));
      if (inReq || inHtml) {
        foundAny = true;
        violations.push({
          id: svc.id, severity: svc.severity, law: svc.law, article: svc.article,
          title: svc.title, description: svc.description,
          fine_min: svc.fine_min, fine_max: svc.fine_max, how_to_fix: svc.how_to_fix
        });
      }
    }

    if (!foundAny) {
      const hasYandex = requests.some(r => r.includes('mc.yandex.ru') || r.includes('metrika.yandex.ru'));
      passed.push(hasYandex
        ? { id: 'yandex-metrika-used', title: 'Используется Яндекс.Метрика', description: 'Вместо Google Analytics используется российский сервис Яндекс.Метрика — соответствует требованиям локализации ПД.' }
        : { id: 'no-foreign-trackers', title: 'Запрещённые иностранные трекеры не обнаружены', description: 'На странице не найдены запрещённые иностранные сервисы аналитики.' }
      );
    }

  } catch (err) {
    // при ошибке возвращаем пустые массивы
  }

  return { violations, passed };
};
