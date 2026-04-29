/**
 * anglicisms.js — 53-ФЗ "О государственном языке РФ" (ред. 2026)
 * С 2026 года ужесточены правила использования иностранных слов
 * в публичном пространстве при наличии утверждённых русских эквивалентов.
 */

const LATIN_UI_WORDS = [
  { word: 'sale',       replace: 'распродажа / скидки' },
  { word: 'new',        replace: 'новинки / новые' },
  { word: 'best',       replace: 'лучшее' },
  { word: 'shop',       replace: 'магазин' },
  { word: 'buy',        replace: 'купить' },
  { word: 'checkout',   replace: 'оформить заказ' },
  { word: 'cart',       replace: 'корзина' },
  { word: 'login',      replace: 'войти' },
  { word: 'password',   replace: 'пароль' },
  { word: 'search',     replace: 'поиск' },
  { word: 'home',       replace: 'главная' },
  { word: 'subscribe',  replace: 'подписаться' },
  { word: 'more',       replace: 'подробнее / ещё' },
  { word: 'download',   replace: 'скачать' },
  { word: 'submit',     replace: 'отправить' },
  { word: 'cancel',     replace: 'отмена' },
  { word: 'close',      replace: 'закрыть' },
  { word: 'filter',     replace: 'фильтр / отбор' },
  { word: 'sort',       replace: 'сортировка' },
  { word: 'back',       replace: 'назад' },
  { word: 'next',       replace: 'далее' },
  { word: 'about',      replace: 'о нас / о компании' },
  { word: 'contact',    replace: 'контакты' },
  { word: 'share',      replace: 'поделиться' },
  { word: 'follow',     replace: 'подписаться' },
  { word: 'all',        replace: 'все' },
  { word: 'view',       replace: 'посмотреть' },
  { word: 'loading',    replace: 'загрузка' },
  { word: 'profile',    replace: 'личный кабинет' },
  { word: 'settings',   replace: 'настройки' },
  { word: 'sign in',    replace: 'войти' },
  { word: 'sign up',    replace: 'зарегистрироваться' },
  { word: 'log in',     replace: 'войти' },
  { word: 'log out',    replace: 'выйти' },
  { word: 'read more',  replace: 'читать далее' },
  { word: 'see all',    replace: 'смотреть все' },
  { word: 'view all',   replace: 'посмотреть все' },
];

// Транслитерированные заимствования, для которых ИРЯ РАН утвердил русские аналоги
const TRANSLITERATED_ANGLICISMS = [
  { word: 'контент',       replace: 'содержание / материалы' },
  { word: 'кейс',          replace: 'пример / случай / дело' },
  { word: 'тренд',         replace: 'тенденция / направление' },
  { word: 'дедлайн',       replace: 'срок / крайний срок' },
  { word: 'лайфхак',       replace: 'полезный совет / приём' },
  { word: 'хайп',          replace: 'ажиотаж / шумиха' },
  { word: 'лонч',          replace: 'запуск' },
  { word: 'апгрейд',       replace: 'обновление / улучшение' },
  { word: 'спикер',        replace: 'докладчик / оратор' },
  { word: 'воркшоп',       replace: 'мастер-класс / семинар' },
  { word: 'чекаут',        replace: 'оформление заказа' },
  { word: 'лайк',          replace: 'отметка «нравится»' },
  { word: 'шеринг',        replace: 'совместное использование' },
  { word: 'фидбек',        replace: 'отзыв / обратная связь' },
  { word: 'брифинг',       replace: 'инструктаж / совещание' },
  { word: 'стартап',       replace: 'молодое предприятие' },
  { word: 'краудфандинг',  replace: 'народное финансирование' },
  { word: 'промо',         replace: 'акция / продвижение' },
  { word: 'бэкграунд',     replace: 'предыстория / опыт' },
  { word: 'таргет',        replace: 'целевая аудитория' },
  { word: 'хэштег',        replace: 'метка / тег' },
  { word: 'сторис',        replace: 'истории' },
  { word: 'лайкнуть',      replace: 'отметить понравившееся' },
  { word: 'постить',       replace: 'публиковать' },
  { word: 'таймлайн',      replace: 'хронология / план-график' },
  { word: 'дропшиппинг',   replace: 'прямые поставки' },
  { word: 'краудсорсинг',  replace: 'общественное участие' },
];

module.exports = async function checkAnglicisms({ $ }) {
  const violations = [];
  const passed = [];

  const $body = $('body').clone();
  $body.find('script, style, noscript').remove();
  const bodyText = $body.text();
  const cyrillicCount = (bodyText.match(/[а-яёА-ЯЁ]/g) || []).length;
  const latinCount    = (bodyText.match(/[a-zA-Z]/g) || []).length;

  // Пропускаем сайты, где русский текст не преобладает (иностранные сайты)
  if (cyrillicCount < 100 || cyrillicCount < latinCount * 0.3) {
    passed.push({
      id: 'anglicisms-skip',
      title: 'Проверка на англицизмы пропущена — сайт не русскоязычный',
      description: 'Проверка по 53-ФЗ применяется только к сайтам с преобладающим русским текстом.'
    });
    return { violations, passed };
  }

  // --- Проверка 1: Латинские слова в UI-элементах ---
  const uiTexts = [];
  const uiDebug = [];
  const UI_SELECTORS = [
    'nav a', 'header a', '.menu a', '[class*="nav"] a', '[class*="menu"] a',
    'button', 'input[type="submit"]', 'input[type="button"]',
    'h1', 'h2', 'h3',
    '[class*="btn"]', '.btn'
  ];

  const SLIDER_CLASSES = ['slick', 'swiper', 'owl-', 'carousel', 'splide', 'glide'];

  $(UI_SELECTORS.join(', ')).each((_, el) => {
    const cls = ($(el).attr('class') || '').toLowerCase();
    const ancestorCls = $(el).parents().toArray()
      .map(p => ($(p).attr('class') || '').toLowerCase())
      .join(' ');
    const allCls = cls + ' ' + ancestorCls;
    if (SLIDER_CLASSES.some(k => allCls.includes(k))) return;
    const text = $(el).text().trim();
    if (text && text.length > 0 && text.length < 80) {
      uiTexts.push(text.toLowerCase());
      uiDebug.push({ tag: el.tagName, cls: ($(el).attr('class') || ''), text });
    }
  });

  const uiCombined = uiTexts.join(' ');
  const foundLatinWords = [];

  for (const item of LATIN_UI_WORDS) {
    const re = new RegExp(`\\b${item.word}\\b`, 'i');
    if (re.test(uiCombined)) {
      foundLatinWords.push(item);
    }
  }

  if (foundLatinWords.length > 0) {
    const isCritical = foundLatinWords.length >= 3;
    const wordList = foundLatinWords.map(w => `«${w.word}»`).join(', ');
    const fixList  = foundLatinWords.slice(0, 5).map(w => `«${w.word}» → «${w.replace}»`).join('; ');
    const debugMatched = uiDebug.filter(d => foundLatinWords.some(w => new RegExp(`\\b${w.word}\\b`, 'i').test(d.text)));
    const debugInfo = debugMatched.slice(0, 3).map(d => `<${d.tag} class="${d.cls}">${d.text}</${d.tag}>`).join(' | ');
    violations.push({
      id: 'anglicisms-latin-ui',
      severity: isCritical ? 'critical' : 'warning',
      law: '53-ФЗ',
      article: 'ст. 3 53-ФЗ (ред. 2026)',
      title: `Иностранные слова в интерфейсе: ${foundLatinWords.length} ${pluralWords(foundLatinWords.length)}`,
      description: `Найдены латинские слова в навигации, заголовках и кнопках: ${wordList}. С 2026 года при наличии русских эквивалентов использование иностранных слов в публичном пространстве ограничено законом. [DEBUG: ${debugInfo}]`,
      fine_min: isCritical ? 50000 : 30000,
      fine_max: isCritical ? 200000 : 100000,
      how_to_fix: `Замените на русские аналоги: ${fixList}.`
    });
  } else {
    passed.push({
      id: 'anglicisms-latin-ui-ok',
      title: 'Иностранные слова в навигации и кнопках не обнаружены',
      description: 'Основные UI-элементы используют русский язык — соответствует требованиям 53-ФЗ.'
    });
  }

  // --- Проверка 2: Транслитерированные англицизмы в тексте ---
  const textLower = bodyText.toLowerCase();
  const foundTranslit = [];

  for (const item of TRANSLITERATED_ANGLICISMS) {
    if (textLower.includes(item.word)) {
      foundTranslit.push(item);
    }
  }

  if (foundTranslit.length >= 5) {
    const wordList = foundTranslit.slice(0, 8).map(w => `«${w.word}»`).join(', ');
    const fixList  = foundTranslit.slice(0, 4).map(w => `«${w.word}» → «${w.replace}»`).join('; ');
    violations.push({
      id: 'anglicisms-transliterated',
      severity: 'warning',
      law: '53-ФЗ',
      article: 'ст. 3 53-ФЗ (ред. 2026)',
      title: `Транслитерированные англицизмы в тексте: ${foundTranslit.length} ${pluralWords(foundTranslit.length)}`,
      description: `Активно используются заимствованные слова, для которых существуют утверждённые русские аналоги (список ИРЯ РАН): ${wordList}. Согласно 53-ФЗ (ред. 2026), их применение в публичном пространстве нежелательно.`,
      fine_min: 30000,
      fine_max: 100000,
      how_to_fix: `Рекомендуемые замены: ${fixList} и другие — по списку Института русского языка РАН.`
    });
  } else if (foundTranslit.length > 0) {
    passed.push({
      id: 'anglicisms-transliterated-minor',
      title: `Англицизмов в тексте немного: ${foundTranslit.length} ${pluralWords(foundTranslit.length)}`,
      description: `Найдено небольшое количество заимствований: ${foundTranslit.map(w => `«${w.word}»`).join(', ')}. Формального нарушения нет, но замена рекомендована.`
    });
  } else {
    passed.push({
      id: 'anglicisms-transliterated-ok',
      title: 'Транслитерированных англицизмов не обнаружено',
      description: 'Сайт использует преимущественно русскую лексику без избыточных заимствований.'
    });
  }

  return { violations, passed };
};

function pluralWords(n) {
  if (n % 10 === 1 && n % 100 !== 11) return 'слово';
  if ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100)) return 'слова';
  return 'слов';
}
