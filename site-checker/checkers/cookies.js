module.exports = async function checkCookies(data) {
  const violations = [];
  const passed = [];

  try {
    const { $, requests = [] } = data;

    // Проверка 1: наличие cookie-баннера
    const textKeywords = ['cookie', 'куки', 'cookies', 'файлы cookie', 'cookie-файл'];
    const attrKeywords = ['cookie', 'cookies', 'consent', 'gdpr', 'banner'];

    let bannerFound = false;
    $('div, section, aside, nav, header, footer, span, p').each(function () {
      if (bannerFound) return false;
      const el = $(this);
      const text = (el.text() || '').toLowerCase();
      const cls = (el.attr('class') || '').toLowerCase();
      const id = (el.attr('id') || '').toLowerCase();
      if (
        textKeywords.some(k => text.includes(k)) ||
        attrKeywords.some(k => cls.includes(k) || id.includes(k))
      ) {
        bannerFound = true;
        return false;
      }
    });

    if (!bannerFound) {
      violations.push({
        id: 'no-cookie-banner',
        severity: 'critical',
        law: '152-ФЗ',
        article: 'ст. 13.11 ч.1 КоАП РФ',
        title: 'Нет cookie-баннера',
        description: 'На сайте не обнаружен баннер с запросом согласия на использование cookie-файлов. Если сайт использует аналитику или формы, пользователь должен дать явное согласие на установку cookies при первом визите.',
        fine_min: 150000,
        fine_max: 300000,
        how_to_fix: 'Добавьте cookie-баннер с кнопками «Принять» и «Отклонить». Баннер должен появляться при первом посещении и быть виден без прокрутки страницы.'
      });
    } else {
      passed.push({
        id: 'has-cookie-banner',
        title: 'Cookie-баннер найден',
        description: 'На сайте обнаружен элемент с запросом согласия на использование cookies.'
      });
    }

    // Проверка 2: кнопка «Отклонить» в баннере
    if (bannerFound) {
      const rejectKeywords = ['отклонить', 'отказаться', 'отказ', 'не принимать', 'reject', 'decline', 'настройки', 'settings', 'manage'];
      let rejectFound = false;
      $('button, a, [role="button"]').each(function () {
        if (rejectFound) return false;
        if (rejectKeywords.some(k => ($(this).text() || '').toLowerCase().includes(k))) {
          rejectFound = true;
          return false;
        }
      });

      if (!rejectFound) {
        violations.push({
          id: 'no-cookie-reject-button',
          severity: 'warning',
          law: '152-ФЗ',
          article: 'ст. 13.11 ч.2 КоАП РФ',
          title: 'В cookie-баннере нет кнопки «Отклонить»',
          description: 'Обнаружен cookie-баннер, но нет возможности отказаться от cookies. По закону пользователь должен иметь равнозначный выбор: принять или отказаться.',
          fine_min: 300000,
          fine_max: 700000,
          how_to_fix: 'Добавьте в баннер кнопку «Отклонить» или «Настройки» рядом с «Принять». Обе кнопки должны быть одинаково заметны.'
        });
      }
    }

    // Проверка 3: аналитика без согласия
    const analyticsPatterns = ['mc.yandex.ru', 'metrika.yandex.ru', 'google-analytics.com', 'googletagmanager.com'];
    const hasAnalytics = requests.some(r => analyticsPatterns.some(p => r.includes(p)));

    if (hasAnalytics && !bannerFound) {
      violations.push({
        id: 'analytics-before-consent',
        severity: 'critical',
        law: '152-ФЗ',
        article: 'ст. 13.11 ч.2 КоАП РФ',
        title: 'Аналитика загружается без согласия пользователя',
        description: 'На сайте подключена веб-аналитика, которая начинает собирать данные до получения согласия. Аналитические cookies должны устанавливаться только после явного согласия (opt-in).',
        fine_min: 300000,
        fine_max: 700000,
        how_to_fix: 'Настройте cookie-менеджер так, чтобы скрипты аналитики загружались только после нажатия «Принять» в баннере.'
      });
    }

  } catch (err) {
    // при ошибке возвращаем пустые массивы
  }

  return { violations, passed };
};
