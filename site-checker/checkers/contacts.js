module.exports = async function checkContacts(data) {
  const violations = [];
  const passed = [];

  try {
    const { $, html = '' } = data;
    const text = $.text();

    // Проверка 1: email или телефон
    const hasEmail = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(text) || /mailto:/i.test(html);
    const hasPhone = /(\+7|8)[\s\-]?\(?\d{3}\)?[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2}/.test(text) || /tel:/i.test(html);

    if (!hasEmail && !hasPhone) {
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

    // Проверка 2: ИНН / ОГРН
    const hasInn = /ИНН[\s:]*\d{10,12}/i.test(text) || /\b\d{10}\b/.test(text);
    const hasOgrn = /ОГРН[\s:]*\d{13,15}/i.test(text);

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
      passed.push({ id: 'has-inn-ogrn', title: 'ИНН/ОГРН найдены', description: 'На сайте обнаружены регистрационные данные организации.' });
    }

    // Проверка 3: Наименование организации
    const hasOrgName = ['ООО', 'АО ', 'ПАО', 'ЗАО', 'ОАО', 'НКО', ' ИП '].some(k => text.includes(k));

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
      passed.push({ id: 'has-org-name', title: 'Наименование организации найдено', description: 'На сайте обнаружено наименование юридического лица или ИП.' });
    }

    // Проверка 4: Юридический адрес
    const hasAddress = ['г.', 'ул.', 'пр-т', 'проспект', 'переулок', 'пер.', 'д.', 'офис', 'корп.'].some(m => text.includes(m));

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
      passed.push({ id: 'has-address', title: 'Адрес организации найден', description: 'На сайте обнаружен адрес организации.' });
    }

  } catch (err) {
    // при ошибке возвращаем пустые массивы
  }

  return { violations, passed };
};
