module.exports = async function checkAdvertising(data) {
  const violations = [];
  const passed = [];

  try {
    const { url = '', $ } = data;

    let currentDomain = '';
    try { currentDomain = new URL(url).hostname.replace('www.', ''); } catch (e) {}

    const SOCIAL_DOMAINS = [
      'vk.com', 't.me', 'telegram.org', 'tlgg.ru', 'rutube.ru', 'dzen.ru', 'zen.yandex.ru',
      'youtube.com', 'youtu.be', 'ok.ru', 'max.ru', 'my.mail.ru',
      'instagram.com', 'facebook.com', 'twitter.com', 'x.com',
      'linkedin.com', 'tiktok.com', 'pinterest.com',
      'wa.me', 'whatsapp.com', 'viber.com', 'viber.click', 'skype.com',
      // бизнес-каталоги, карты, сайты отзывов — не реклама
      'yandex.ru', 'yandex.com', '2gis.ru', 'zoon.ru', 'flamp.ru',
      'avito.ru', 'hh.ru', 'superjob.ru', 'rabota.ru', 'google.com', 'google.ru',
      'maps.google.com', 'otzovik.com', 'irecommend.ru', 'prodoctorov.ru',
      'gosuslugi.ru', 'nalog.gov.ru', 'egrul.nalog.ru'
    ];

    const adBlocks = [];
    $('a[href]').each(function () {
      const el = $(this);
      const href = el.attr('href') || '';
      if (!href.startsWith('http')) return;

      let isExternal = false;
      let linkDomain = '';
      try {
        linkDomain = new URL(href).hostname.replace('www.', '');
        isExternal = linkDomain !== currentDomain && linkDomain !== '';
      } catch (e) { return; }
      if (!isExternal) return;

      // Ссылки на собственные страницы компании в соцсетях — не реклама
      if (SOCIAL_DOMAINS.some(sd => linkDomain === sd || linkDomain.endsWith('.' + sd))) return;

      const hasImg = el.find('img').length > 0;
      const cls = (el.attr('class') || '').toLowerCase();
      const id = (el.attr('id') || '').toLowerCase();
      const isAdAttr = ['banner', 'ad-', '-ad', 'adv', 'sponsor', 'promo'].some(k => cls.includes(k) || id.includes(k));
      const isAffiliate = ['utm_medium=cpc', 'utm_medium=paid', 'utm_medium=banner', 'aff=', 'affiliate'].some(k => href.includes(k));

      if (hasImg || isAdAttr || isAffiliate) adBlocks.push({ el, href, hasImg, isAffiliate });
    });

    console.log('[ad-debug] adBlocks:', adBlocks.map(b => ({ href: b.href, hasImg: b.hasImg, isAffiliate: b.isAffiliate })));

    if (adBlocks.length === 0) {
      passed.push({ id: 'no-ads-detected', title: 'Рекламные блоки не обнаружены', description: 'На странице не найдены внешние рекламные баннеры или партнёрские ссылки, требующие маркировки ERID.' });
      return { violations, passed };
    }

    const adLabelKw = ['реклама', 'рекл.', 'sponsored', 'advertisement'];
    let anyWithoutLabel = false;
    let anyWithoutErid = false;
    let anyAffiliate = false;

    for (const block of adBlocks) {
      const ctx = ((block.el.parent().text() || '') + ' ' + (block.el.siblings().text() || '')).toLowerCase();
      const hasLabel = adLabelKw.some(k => ctx.includes(k));
      const hasErid = block.href.includes('erid=') || ctx.includes('erid:');

      if (!hasLabel && block.hasImg) anyWithoutLabel = true;
      if (!hasErid && block.hasImg) anyWithoutErid = true;
      if (block.isAffiliate && !hasLabel) anyAffiliate = true;
    }

    if (anyWithoutLabel) {
      violations.push({
        id: 'ad-without-label',
        severity: 'critical',
        law: '38-ФЗ «О рекламе»',
        article: 'ст. 14.3 КоАП РФ',
        title: 'Реклама без пометки «Реклама»',
        description: 'На сайте обнаружены рекламные материалы без обязательной пометки «Реклама». С 01.09.2023 каждый рекламный блок в интернете обязан быть помечен и содержать данные о рекламодателе.',
        fine_min: 200000,
        fine_max: 500000,
        how_to_fix: 'Добавьте к каждому рекламному блоку текст «Реклама» и ИНН рекламодателя. Пример: «Реклама. ООО "Альфа". ИНН: 1234567890. erid: 2VtzqXXX»'
      });
    }

    if (anyWithoutErid) {
      violations.push({
        id: 'ad-without-erid',
        severity: 'critical',
        law: '38-ФЗ «О рекламе»',
        article: 'ст. 14.3 КоАП РФ',
        title: 'Рекламные материалы без токена ERID',
        description: 'Найдены рекламные блоки без токена ERID. Каждый рекламный материал должен до публикации получить уникальный токен от ОРД (Яндекс, VK, МТС и др.).',
        fine_min: 200000,
        fine_max: 500000,
        how_to_fix: 'Зарегистрируйтесь в ОРД (ord.yandex.ru или advertising.vk.com), получите ERID для каждого материала и добавьте токен в URL.'
      });
    }

    if (anyAffiliate) {
      violations.push({
        id: 'affiliate-without-label',
        severity: 'warning',
        law: '38-ФЗ «О рекламе»',
        article: 'ст. 14.3 КоАП РФ',
        title: 'Партнёрские ссылки без маркировки',
        description: 'На сайте найдены партнёрские/реферальные ссылки без пометки «Реклама». Если сайт получает вознаграждение за переходы — это реклама, требующая маркировки.',
        fine_min: 200000,
        fine_max: 500000,
        how_to_fix: 'Пометьте все партнёрские ссылки как «Реклама», получите ERID в ОРД и укажите информацию о рекламодателе.'
      });
    }

    if (!anyWithoutLabel && !anyWithoutErid && !anyAffiliate) {
      passed.push({ id: 'ads-properly-marked', title: 'Рекламные блоки маркированы', description: 'Найденные рекламные блоки содержат признаки маркировки.' });
    }

  } catch (err) {
    // при ошибке возвращаем пустые массивы
  }

  return { violations, passed };
};
