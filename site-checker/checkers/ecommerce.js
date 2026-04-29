module.exports = async function checkEcommerce(data) {
  const violations = [];
  const passed = [];

  try {
    const { $, requests = [] } = data;

    const $body = $('body').clone();
    $body.find('script, style, noscript').remove();
    const text = $body.text().toLowerCase();
    const html = (data.html || '').toLowerCase();

    // --- Определяем настоящий интернет-магазин ---
    // Нужно минимум 2 сильных признака

    let signals = 0;

    // Признак 1: кнопка «В корзину» / «Добавить в корзину»
    const btnTexts = $('button, a, input[type="submit"]').toArray()
      .map(el => $(el).text().toLowerCase());
    const hasCartBtn = btnTexts.some(t =>
      ['в корзину', 'добавить в корзину', 'купить сейчас', 'add to cart'].some(k => t.includes(k))
    );
    if (hasCartBtn) signals++;

    // Признак 2: элементы корзины в HTML (классы/id)
    const hasCartElement = $('[class*="cart"], [class*="basket"], [id*="cart"], [id*="basket"], [class*="корзин"]').length > 0;
    if (hasCartElement) signals++;

    // Признак 3: платформа интернет-магазина
    const SHOP_PLATFORMS = [
      'bitrix', 'opencart', 'woocommerce', 'shopify', 'ecwid',
      '1c-bitrix', 'prestashop', 'magento', 'tilda.ws/tildashop'
    ];
    if (SHOP_PLATFORMS.some(p => html.includes(p) || requests.some(r => r.includes(p)))) signals++;

    // Признак 4: служба доставки физических товаров + цены
    const hasDeliveryService = ['сдэк', 'cdek', 'boxberry', 'боксберри', 'dhl', 'почта россии',
      'яндекс.доставка', 'яндекс доставка'].some(k => text.includes(k));
    const hasPrices = ($('[class*="price"], [class*="цена"], [class*="cost"]').length > 2) ||
                      (text.match(/\d+\s*₽/g) || []).length > 3 ||
                      (text.match(/\d+\s*руб[.\s]/g) || []).length > 3;
    if (hasDeliveryService && hasPrices) signals++;

    // Признак 5: карточки товаров (структурированный каталог)
    // [class*="item"] намеренно исключён — слишком широкий (menu-item, nav-item и т.п.)
    const hasProductCards = $('[class*="product"], [class*="товар"]').length > 3;
    if (hasProductCards && hasPrices) signals++;

    if (signals < 3) {
      passed.push({
        id: 'not-ecommerce',
        title: 'Интернет-магазин не обнаружен',
        description: 'Признаки интернет-магазина не найдены. Специальные требования ЗоЗПП для электронной торговли не применяются.'
      });
      return { violations, passed };
    }

    // --- Проверки для интернет-магазина ---

    // Условия возврата
    if (!['возврат', 'обмен товара', '7 дней', '14 дней', '90 дней', 'возврат товара'].some(k => text.includes(k))) {
      violations.push({
        id: 'no-return-policy',
        severity: 'warning',
        law: 'ЗоЗПП ст. 26.1',
        article: 'ст. 26.1 ЗоЗПП',
        title: 'Нет условий возврата товара',
        description: 'На сайте интернет-магазина не найдена информация об условиях возврата. По ЗоЗПП покупатель вправе отказаться от товара в течение 7 дней, а при отсутствии письменной информации — в течение 90 дней.',
        fine_min: 10000,
        fine_max: 30000,
        how_to_fix: 'Добавьте раздел «Возврат и обмен» с описанием: срок возврата (7 дней), порядок возврата, сроки возврата денег (10 дней).'
      });
    } else {
      passed.push({ id: 'has-return-policy', title: 'Политика возврата найдена', description: 'На сайте обнаружена информация об условиях возврата товара.' });
    }

    // Информация о доставке
    if (!['доставка', 'сроки доставки', 'способы доставки', 'курьер', 'самовывоз'].some(k => text.includes(k))) {
      violations.push({
        id: 'no-delivery-info',
        severity: 'warning',
        law: 'ЗоЗПП ст. 26.1',
        article: 'ст. 26.1 ЗоЗПП',
        title: 'Нет информации о доставке',
        description: 'На сайте интернет-магазина не найдена информация о способах и сроках доставки. Продавец обязан предоставить эту информацию до оформления заказа.',
        fine_min: 10000,
        fine_max: 20000,
        how_to_fix: 'Добавьте раздел «Доставка» с указанием: способы доставки, сроки, стоимость, регионы.'
      });
    } else {
      passed.push({ id: 'has-delivery-info', title: 'Информация о доставке найдена', description: 'На сайте обнаружены условия доставки.' });
    }

    // Подписка без отмены (ФЗ-376)
    if (['подписка', 'subscription', 'ежемесячно', 'автопродление', 'автоматическое списание'].some(k => text.includes(k))) {
      if (!['отменить', 'отмена', 'cancel', 'unsubscribe', 'управление подпиской'].some(k => text.includes(k))) {
        violations.push({
          id: 'subscription-no-cancel',
          severity: 'warning',
          law: 'ФЗ-376 (с 01.03.2026)',
          article: 'ст. 26.1 ЗоЗПП',
          title: 'Подписка без возможности простой отмены',
          description: 'На сайте обнаружена платная подписка, но не найдена функция онлайн-отмены. С 01.03.2026 по ФЗ-376 запрещено автоматическое продление без явного согласия.',
          fine_min: 50000,
          fine_max: 100000,
          how_to_fix: 'Добавьте кнопку «Отменить подписку» в личном кабинете. Перед автосписанием пользователь должен получать уведомление.'
        });
      }
    }

    // Цены в иностранной валюте
    const rawText = $body.text();
    if (/\d[\d\s]*[$€£]|[$€£]\s*\d|\d[\d\s]*(USD|EUR|GBP)/i.test(rawText)) {
      if (!text.includes('₽') && !text.includes('руб')) {
        violations.push({
          id: 'prices-not-in-rubles',
          severity: 'warning',
          law: 'ЗоЗПП ст. 10',
          article: 'ст. 10 ЗоЗПП',
          title: 'Цены указаны не в рублях',
          description: 'На сайте обнаружены цены в иностранной валюте без рублёвого эквивалента. По ЗоЗПП продавец обязан указывать цены в рублях.',
          fine_min: 10000,
          fine_max: 20000,
          how_to_fix: 'Укажите цены в рублях. Рублёвая цена должна быть основной.'
        });
      }
    }

  } catch (err) {
    // при ошибке возвращаем пустые массивы
  }

  return { violations, passed };
};
