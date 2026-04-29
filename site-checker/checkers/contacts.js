module.exports = async function checkContacts(data) {
  const violations = [];
  const passed = [];

  try {
    const { $, html = '', url = '' } = data;
    const text = $.text();

    function extractInfo(t) {
      return {
        hasEmail:   /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(t) || /mailto:/i.test(t),
        hasPhone:   /(\+7|8)[\s\-]?\(?\d{3}\)?[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2}/.test(t) || /tel:/i.test(t),
        hasInn:     /ИНН[\s:]*\d{10,12}/i.test(t) || /\b\d{10}\b/.test(t),
        hasOgrn:    /ОГРН[\s:]*\d{13,15}/i.test(t),
        hasOrgName: ['ООО', 'АО ', 'ПАО', 'ЗАО', 'ОАО', 'НКО', ' ИП '].some(k => t.includes(k)),
        hasAddress: ['г.', 'ул.', 'пр-т', 'проспект', 'переулок', 'пер.', 'д.', 'офис', 'корп.'].some(m => t.includes(m)),
      };
    }

    const cur = extractInfo(text);

    // Если чего-то не нашли — пробуем подгрузить страницу контактов
    const needsFallback = !cur.hasInn || !cur.hasOgrn || !cur.hasOrgName || !cur.hasAddress;
    const urlPath = (() => { try { return new URL(url).pathname; } catch(e) { return url; } })();
    const lastSegment = urlPath.split('/').filter(Boolean).pop() || '';
    const isContactsPage = /^(kontakt|contact|o-kompanii|about|rekvizit)/i.test(lastSegment);

    let fb = null;
    let fbUrl = '';

    if (needsFallback && !isContactsPage) {
      try {
        const base = new URL(url);
        const candidates = ['/kontakty/', '/contacts/', '/kontakt/', '/o-kompanii/', '/rekvizity/'];
        for (const p of candidates) {
          try {
            const resp = await fetch(base.origin + p, {
              headers: { 'User-Agent': 'Mozilla/5.0' },
              signal: AbortSignal.timeout(5000)
            });
            if (resp.ok) {
              fb = extractInfo(await resp.text());
              fbUrl = p;
              break;
            }
          } catch (e) {}
        }
      } catch (e) {}
    }

    const onContacts = (field) => fb && fb[field];
    const foundAt = (field) => cur[field] ? '' : onContacts(field) ? ` Информация не указана на текущей странице, но найдена в разделе «Контакты».` : '';

    // --- Проверка 1: email или телефон ---
    if (!cur.hasEmail && !cur.hasPhone) {
      violations.push({
        id: 'no-contacts',
        severity: 'critical',
        law: '149-ФЗ «Об информации»',
        article: 'ст. 9 149-ФЗ',
        title: 'Нет контактных данных',
        description: 'На сайте не найдены контактные данные: ни email-адрес, ни номер телефона. По закону об информации организация обязана указать способы обратной связи.',
        fine_min: 100000,
        fine_max: 500000,
        how_to_fix: 'Добавьте в раздел «Контакты» или в подвал сайта email-адрес и/или телефон организации.'
      });
    } else {
      passed.push({ id: 'has-contacts', title: 'Контактные данные найдены', description: 'На сайте обнаружены контактные данные (email или телефон).' });
    }

    // --- Проверка 2: ИНН / ОГРН ---
    const hasInn  = cur.hasInn  || onContacts('hasInn');
    const hasOgrn = cur.hasOgrn || onContacts('hasOgrn');

    if (!hasInn && !hasOgrn) {
      violations.push({
        id: 'no-inn-ogrn',
        severity: 'warning',
        law: 'ЗоЗПП ст. 26.1',
        article: 'ст. 14.8 КоАП РФ',
        title: 'Не указаны ИНН и ОГРН',
        description: 'На сайте не найдены ИНН и ОГРН организации. Закон о защите прав потребителей требует указывать регистрационные данные продавца.',
        fine_min: 10000,
        fine_max: 20000,
        how_to_fix: 'Добавьте в раздел «О компании» или в подвал: ИНН, ОГРН/ОГРНИП и полное наименование организации.'
      });
    } else {
      const note = foundAt('hasInn') || foundAt('hasOgrn');
      passed.push({ id: 'has-inn-ogrn', title: 'ИНН/ОГРН найдены', description: `На сайте обнаружены регистрационные данные организации.${note}` });
    }

    // --- Проверка 3: Наименование организации ---
    const hasOrgName = cur.hasOrgName || onContacts('hasOrgName');

    if (!hasOrgName) {
      violations.push({
        id: 'no-org-name',
        severity: 'warning',
        law: 'ЗоЗПП ст. 26.1',
        article: 'ст. 14.8 КоАП РФ',
        title: 'Не указано наименование организации',
        description: 'На сайте не найдено наименование юридического лица или ИП. Закон обязывает продавца указывать своё фирменное наименование.',
        fine_min: 10000,
        fine_max: 20000,
        how_to_fix: 'Укажите в подвале или на странице «О компании»: полное наименование ООО/ИП, ИНН, юридический адрес.'
      });
    } else {
      const note = foundAt('hasOrgName');
      passed.push({ id: 'has-org-name', title: 'Наименование организации найдено', description: `На сайте обнаружено наименование юридического лица или ИП.${note}` });
    }

    // --- Проверка 4: Юридический адрес ---
    const hasAddress = cur.hasAddress || onContacts('hasAddress');

    if (!hasAddress) {
      violations.push({
        id: 'no-legal-address',
        severity: 'warning',
        law: 'ЗоЗПП ст. 26.1',
        article: 'ст. 14.8 КоАП РФ',
        title: 'Не указан юридический адрес',
        description: 'На сайте не найден юридический или физический адрес организации. Покупатель имеет право знать физическое местонахождение продавца.',
        fine_min: 10000,
        fine_max: 20000,
        how_to_fix: 'Укажите юридический адрес в разделе «Реквизиты», «Контакты» или в подвале сайта.'
      });
    } else {
      const note = foundAt('hasAddress');
      passed.push({ id: 'has-address', title: 'Адрес организации найден', description: `На сайте обнаружен адрес организации.${note}` });
    }

  } catch (err) {
    // при ошибке возвращаем пустые массивы
  }

  return { violations, passed };
};
