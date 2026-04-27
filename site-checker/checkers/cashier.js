module.exports = async function checkCashier(data) {
  const violations = [];
  const passed = [];

  try {
    const { $, requests = [] } = data;
    const text = $.text().toLowerCase();
    const html = (data.html || '').toLowerCase();

    // Определяем признаки приёма оплаты
    let signals = 0;
    if (['купить', 'оплатить', 'заказать', 'корзина', 'cart', 'checkout', 'оплата'].some(k => text.includes(k))) signals++;
    if (['цена', 'стоимость', '₽', 'рублей', 'руб.'].some(k => text.includes(k))) signals++;
    if (['доставка', 'товар', 'каталог'].some(k => text.includes(k))) signals++;

    const btnText = [];
    $('button, input[type="submit"], a').each(function () {
      btnText.push(($(this).text() || '').toLowerCase());
    });
    if (btnText.some(t => ['купить', 'оплатить', 'заказать', 'в корзину', 'checkout', 'buy', 'pay'].some(k => t.includes(k)))) signals++;

    if (signals < 2) {
      passed.push({ id: 'no-payment-detected', title: 'Приём платежей не обнаружен', description: 'На странице не найдено признаков приёма оплаты от физических лиц. Требования 54-ФЗ не применяются.' });
      return { violations, passed };
    }

    // Проверяем упоминание ОФД
    const ofdDomains = ['ofd.ru', 'taxcom.ru', 'platforma-ofd.ru', '1c-ofd.ru', 'sberofd.ru'];
    const ofdKw = ['офд', 'оператор фискальных', 'онлайн-касса', 'электронный чек', 'фискальный', 'ккт'];

    const hasOfd = requests.some(r => ofdDomains.some(d => r.includes(d))) ||
                   ofdKw.some(k => text.includes(k)) ||
                   ofdDomains.some(d => html.includes(d));

    if (!hasOfd) {
      violations.push({
        id: 'no-ofd-link',
        severity: 'critical',
        law: '54-ФЗ «О применении ККТ»',
        article: 'ст. 14.5 КоАП РФ',
        title: 'Нет сведений об онлайн-кассе (ОФД)',
        description: 'На сайте обнаружены признаки приёма оплаты, но нет информации об онлайн-кассе и ОФД. По ФЗ-54 все расчёты с физлицами должны проходить через зарегистрированную ККТ, покупатель обязан получить чек.',
        fine_min: 30000,
        fine_max: 40000,
        how_to_fix: 'Подключите онлайн-кассу (ЮKassa, Robokassa, CloudPayments и др.). Убедитесь, что покупателю отправляется электронный чек на email или телефон.'
      });
    } else {
      passed.push({ id: 'ofd-mentioned', title: 'Онлайн-касса/ОФД упоминаются', description: 'На сайте обнаружены признаки использования онлайн-кассы или ОФД.' });
    }

    // Упоминание электронного чека
    if (!['чек', 'электронный чек', 'квитанция', 'receipt'].some(k => text.includes(k))) {
      violations.push({
        id: 'no-check-mention',
        severity: 'warning',
        law: '54-ФЗ «О применении ККТ»',
        article: 'ст. 14.5 КоАП РФ',
        title: 'Нет упоминания о выдаче чека покупателю',
        description: 'По ФЗ-54 продавец обязан отправить покупателю электронный кассовый чек. На сайте нет информации о том, как покупатель его получит.',
        fine_min: 10000,
        fine_max: 30000,
        how_to_fix: 'Добавьте в описание процесса оплаты: покупатель получит электронный чек на указанный email или телефон.'
      });
    }

  } catch (err) {
    // при ошибке возвращаем пустые массивы
  }

  return { violations, passed };
};
