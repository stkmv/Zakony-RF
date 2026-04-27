module.exports = async function checkMessengers(data) {
  const violations = [];
  const passed = [];

  try {
    const { $, html = '' } = data;
    const htmlLower = html.toLowerCase();

    // Проверка 1: Telegram
    let telegramFound = false;
    $('a[href]').each(function () {
      const h = ($(this).attr('href') || '').toLowerCase();
      if (h.includes('t.me/') || h.includes('telegram.me/') || h.includes('telegram.org')) {
        telegramFound = true; return false;
      }
    });
    if (!telegramFound) telegramFound = htmlLower.includes('telegram.org/js') || $('[class*="telegram"],[id*="telegram"]').length > 0;

    if (telegramFound) {
      violations.push({
        id: 'telegram-widget-detected',
        severity: 'warning',
        law: '41-ФЗ «Об иностранных мессенджерах»',
        article: 'ст. 14.8 КоАП РФ',
        title: 'Кнопка/виджет Telegram для поддержки клиентов',
        description: 'На сайте обнаружена кнопка Telegram для связи с клиентами. С 01.06.2025 по ФЗ-41 бизнес не вправе использовать иностранные мессенджеры для обслуживания клиентов.',
        fine_min: 100000,
        fine_max: 500000,
        how_to_fix: 'Замените Telegram на российский мессенджер из реестра Минцифры: MAX, VK Мессенджер, Пачка или МТС Линк.'
      });
    }

    // Проверка 2: WhatsApp
    let whatsappFound = false;
    $('a[href]').each(function () {
      const h = ($(this).attr('href') || '').toLowerCase();
      if (h.includes('wa.me/') || h.includes('api.whatsapp.com') || h.includes('whatsapp.com')) {
        whatsappFound = true; return false;
      }
    });
    if (!whatsappFound) whatsappFound = $('[class*="whatsapp"],[id*="whatsapp"]').length > 0 || $('img[src*="whatsapp"]').length > 0;

    if (whatsappFound) {
      violations.push({
        id: 'whatsapp-widget-detected',
        severity: 'warning',
        law: '41-ФЗ «Об иностранных мессенджерах»',
        article: 'ст. 14.8 КоАП РФ',
        title: 'Кнопка/виджет WhatsApp для поддержки клиентов',
        description: 'На сайте найдена кнопка WhatsApp. С 01.06.2025 WhatsApp запрещён для использования бизнесом в целях клиентского сервиса.',
        fine_min: 100000,
        fine_max: 500000,
        how_to_fix: 'Замените WhatsApp на MAX, VK Мессенджер или другой российский мессенджер из реестра Минцифры.'
      });
    }

    // Проверка 3: Viber
    let viberFound = false;
    $('a[href]').each(function () {
      const h = ($(this).attr('href') || '').toLowerCase();
      if (h.includes('viber://') || h.includes('viber.com')) { viberFound = true; return false; }
    });
    if (!viberFound) viberFound = $('[class*="viber"],[id*="viber"]').length > 0;

    if (viberFound) {
      violations.push({
        id: 'viber-widget-detected',
        severity: 'warning',
        law: '41-ФЗ «Об иностранных мессенджерах»',
        article: 'ст. 14.8 КоАП РФ',
        title: 'Кнопка Viber на сайте',
        description: 'На сайте найдена кнопка Viber для связи с клиентами. Viber включён в список запрещённых для бизнеса иностранных мессенджеров согласно ФЗ-41.',
        fine_min: 100000,
        fine_max: 500000,
        how_to_fix: 'Удалите кнопку Viber и замените на российский аналог из реестра Минцифры.'
      });
    }

    // Проверка 4: Facebook / Instagram (Meta — запрещённая организация)
    let metaFound = false;
    $('a[href]').each(function () {
      const h = ($(this).attr('href') || '').toLowerCase();
      if (h.includes('facebook.com') || h.includes('fb.com') || h.includes('instagram.com') || h.includes('instagr.am')) {
        metaFound = true; return false;
      }
    });
    if (!metaFound) metaFound = htmlLower.includes('connect.facebook.net') || $('[class*="facebook"],[class*="instagram"]').length > 0;

    if (metaFound) {
      violations.push({
        id: 'facebook-instagram-detected',
        severity: 'critical',
        law: 'Запрет деятельности Meta в РФ',
        article: 'УК РФ ст. 280, ст. 205.2',
        title: 'Ссылки на Facebook / Instagram (Meta — запрещённая организация)',
        description: 'На сайте найдены ссылки на Facebook или Instagram. Meta Platforms признана в России экстремистской организацией. Размещение ссылок и виджетов может быть квалифицировано как поддержка запрещённой организации.',
        fine_min: 0,
        fine_max: 0,
        warning: 'Возможна уголовная ответственность',
        how_to_fix: 'Немедленно удалите все ссылки на Facebook и Instagram. Замените на ВКонтакте и Одноклассники.'
      });
    }

    if (!telegramFound && !whatsappFound && !viberFound && !metaFound) {
      const hasVk = $('a[href*="vk.com"],a[href*="ok.ru"]').length > 0;
      passed.push(hasVk
        ? { id: 'russian-socials-used', title: 'Используются российские соцсети', description: 'На сайте найдены ссылки на разрешённые российские соцсети (ВКонтакте, Одноклассники).' }
        : { id: 'no-messenger-widgets', title: 'Виджеты запрещённых мессенджеров не обнаружены', description: 'На странице не найдены виджеты или кнопки для связи через запрещённые мессенджеры.' }
      );
    }

  } catch (err) {
    // при ошибке возвращаем пустые массивы
  }

  return { violations, passed };
};
