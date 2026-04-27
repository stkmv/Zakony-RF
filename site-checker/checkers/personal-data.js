module.exports = async function checkPersonalData(data) {
  const violations = [];
  const passed = [];

  try {
    const { $ } = data;

    // Проверка 1: Политика конфиденциальности
    let privacyFound = false;
    $('a').each(function () {
      const href = ($(this).attr('href') || '').toLowerCase();
      const text = ($(this).text() || '').toLowerCase();
      if (['политик', 'privacy', 'конфиденциальност', 'персональн'].some(k => href.includes(k) || text.includes(k))) {
        privacyFound = true;
        return false;
      }
    });

    if (!privacyFound) {
      violations.push({
        id: 'no-privacy-policy',
        severity: 'critical',
        law: '152-ФЗ «О персональных данных»',
        article: 'ст. 13.11 ч.1 КоАП РФ',
        title: 'Нет политики конфиденциальности',
        description: 'На сайте не найдена ссылка на политику конфиденциальности. По закону каждый сайт, собирающий любые данные о пользователях (имя, email, телефон, cookies), обязан иметь публичный документ с описанием порядка их обработки.',
        fine_min: 150000,
        fine_max: 300000,
        how_to_fix: 'Создайте страницу «Политика конфиденциальности» и добавьте ссылку на неё в подвал каждой страницы. Политика должна описывать: какие данные собираете, с какой целью, сколько хранится, кому передаётся.'
      });
    } else {
      passed.push({
        id: 'has-privacy-policy',
        title: 'Политика конфиденциальности найдена',
        description: 'Ссылка на политику конфиденциальности обнаружена на странице.'
      });
    }

    // Проверка 2: Формы без чекбокса согласия
    let formsWithData = 0;
    let formsWithConsent = 0;

    $('form').each(function () {
      const form = $(this);
      const hasDataField = form.find('input[type="email"], input[type="tel"], input[name]').length > 0;
      if (!hasDataField) return;
      formsWithData++;
      if (form.find('input[type="checkbox"]').length > 0) formsWithConsent++;
    });

    if (formsWithData > 0 && formsWithConsent < formsWithData) {
      violations.push({
        id: 'no-form-consent',
        severity: 'critical',
        law: '152-ФЗ «О персональных данных»',
        article: 'ст. 13.11 ч.2 КоАП РФ',
        title: 'Форма без чекбокса согласия на обработку ПД',
        description: `На сайте найдено ${formsWithData} форм(ы) для сбора данных, но не все содержат чекбокс согласия на обработку персональных данных. Пользователь обязан явно дать согласие перед отправкой своих данных.`,
        fine_min: 300000,
        fine_max: 700000,
        how_to_fix: 'Добавьте в каждую форму незаполненный чекбокс со ссылкой на политику. Пример: «Я согласен(а) с [политикой конфиденциальности]». Чекбокс по умолчанию должен быть пустым.'
      });
    } else if (formsWithData > 0) {
      passed.push({
        id: 'has-form-consent',
        title: 'Согласие на обработку ПД в формах',
        description: 'Все найденные формы содержат чекбокс согласия на обработку персональных данных.'
      });
    } else {
      passed.push({
        id: 'no-forms-found',
        title: 'Форм сбора данных не найдено',
        description: 'На странице не обнаружены формы с полями для ввода персональных данных.'
      });
    }

    // Проверка 3: Чекбокс проставлен по умолчанию
    let preCheckedFound = false;
    $('form').each(function () {
      const form = $(this);
      if (!form.find('input[type="email"], input[type="tel"]').length) return;
      form.find('input[type="checkbox"]').each(function () {
        const el = $(this);
        const checkedAttr = el.attr('checked');
        if (checkedAttr !== undefined && checkedAttr !== false) {
          preCheckedFound = true;
          return false;
        }
      });
    });

    if (preCheckedFound) {
      violations.push({
        id: 'consent-pre-checked',
        severity: 'critical',
        law: '152-ФЗ «О персональных данных»',
        article: 'ст. 13.11 ч.2 КоАП РФ',
        title: 'Чекбокс согласия проставлен по умолчанию',
        description: 'Найден чекбокс согласия на обработку персональных данных, который уже отмечен при загрузке страницы. По закону согласие — это активное действие пользователя. Предзаполненный чекбокс не является законным согласием.',
        fine_min: 300000,
        fine_max: 700000,
        how_to_fix: 'Уберите атрибут checked у чекбокса согласия. Пользователь должен сам поставить галочку.'
      });
    }

    // Проверка 4: Шаблонная политика (незаполненные плейсхолдеры)
    if (privacyFound) {
      const pageText = $.text();
      const templateMarkers = ['[наименование', '[ФИО', '[адрес', '[дата', '[вставить', '[укажите'];
      if (templateMarkers.some(m => pageText.toLowerCase().includes(m.toLowerCase()))) {
        violations.push({
          id: 'template-privacy-policy',
          severity: 'warning',
          law: '152-ФЗ «О персональных данных»',
          article: 'ст. 13.11 ч.1 КоАП РФ',
          title: 'Политика конфиденциальности — незаполненный шаблон',
          description: 'Обнаружены незаполненные поля-плейсхолдеры в тексте политики (например, «[наименование организации]»). Шаблон не адаптирован под сайт и не имеет юридической силы.',
          fine_min: 150000,
          fine_max: 300000,
          how_to_fix: 'Заполните все поля: укажите реальное наименование организации, ИНН, адрес, конкретные используемые сервисы, цели и сроки обработки данных.'
        });
      }
    }

  } catch (err) {
    // при ошибке возвращаем пустые массивы
  }

  return { violations, passed };
};
