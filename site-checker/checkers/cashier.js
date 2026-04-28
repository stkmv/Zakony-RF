module.exports = async function checkCashier(data) {
  const violations = [];
  const passed = [];

  try {
    const { $, requests = [] } = data;
    const text = $('body').clone().find('script, style, noscript').remove().end().text().toLowerCase();
    const html = (data.html || '').toLowerCase();

    // Домены реальных платёжных систем
    const PAYMENT_DOMAINS = [
      'yookassa.ru', 'yoomoney.ru', 'money.yandex.ru',
      'robokassa.ru', 'cloudpayments.ru', 'paykeeper.ru',
      'unitpay.ru', 'paymaster.ru', 'interkassa.com',
      'tinkoff.ru/tinkoff-checkout', 'acquiring.sberbank.ru',
      'securepayments.sberbank.ru', 'ecomm.sberbank.ru',
      'stripe.com', 'paypal.com', 'bepaid.by',
      'alfaclick.com', 'alfa.bank', 'psbank.ru'
    ];

    // Фразы, однозначно указывающие на онлайн-оплату на сайте
    const PAYMENT_PHRASES = [
      'оплата картой', 'оплатить картой', 'оплата онлайн', 'оплатить онлайн',
      'оплатить сейчас', 'оплата на сайте', 'банковской картой',
      'введите номер карты', 'номер карты', 'cvv', 'cvc',
      'перейти к оплате', 'оформить и оплатить'
    ];

    // Поля для ввода карты в формах
    const hasCardInput = $('input').toArray().some(el => {
      const autocomplete = ($(el).attr('autocomplete') || '').toLowerCase();
      const name = ($(el).attr('name') || '').toLowerCase();
      const placeholder = ($(el).attr('placeholder') || '').toLowerCase();
      return ['cc-number', 'cc-csc', 'cc-exp', 'cardnumber', 'card-number'].some(k =>
        autocomplete.includes(k) || name.includes(k) || placeholder.includes(k)
      );
    });

    const hasPaymentDomain = requests.some(r => PAYMENT_DOMAINS.some(d => r.includes(d))) ||
                             PAYMENT_DOMAINS.some(d => html.includes(d));
    const hasPaymentPhrase = PAYMENT_PHRASES.some(k => text.includes(k));

    const hasRealPayment = hasPaymentDomain || hasPaymentPhrase || hasCardInput;

    if (!hasRealPayment) {
      passed.push({
        id: 'no-payment-detected',
        title: 'Онлайн-оплата не обнаружена',
        description: 'На странице не найдено признаков приёма онлайн-платежей (платёжные виджеты, ввод карты). Требования 54-ФЗ не применяются.'
      });
      return { violations, passed };
    }

    // Проверяем упоминание ОФД / кассы
    const OFD_DOMAINS = ['ofd.ru', 'taxcom.ru', 'platforma-ofd.ru', '1c-ofd.ru', 'sberofd.ru'];
    const OFD_PHRASES = ['офд', 'оператор фискальных', 'онлайн-касса', 'электронный чек', 'фискальный', 'ккт'];

    const hasOfd = requests.some(r => OFD_DOMAINS.some(d => r.includes(d))) ||
                   OFD_PHRASES.some(k => text.includes(k)) ||
                   OFD_DOMAINS.some(d => html.includes(d));

    if (!hasOfd) {
      violations.push({
        id: 'no-ofd-link',
        severity: 'critical',
        law: '54-ФЗ «О применении ККТ»',
        article: 'ст. 14.5 КоАП РФ',
        title: 'Нет сведений об онлайн-кассе (ОФД)',
        description: 'На сайте обнаружена онлайн-оплата, но нет информации об онлайн-кассе и ОФД. По 54-ФЗ все расчёты с физлицами должны проходить через зарегистрированную ККТ, покупатель обязан получить чек.',
        fine_min: 30000,
        fine_max: 40000,
        how_to_fix: 'Подключите онлайн-кассу (ЮKassa, Robokassa, CloudPayments и др.). Убедитесь, что покупателю отправляется электронный чек на email или телефон.'
      });
    } else {
      passed.push({
        id: 'ofd-mentioned',
        title: 'Онлайн-касса/ОФД обнаружены',
        description: 'На сайте найдены признаки использования онлайн-кассы или ОФД.'
      });
    }

    if (!['чек', 'электронный чек', 'квитанция', 'receipt'].some(k => text.includes(k))) {
      violations.push({
        id: 'no-check-mention',
        severity: 'warning',
        law: '54-ФЗ «О применении ККТ»',
        article: 'ст. 14.5 КоАП РФ',
        title: 'Нет упоминания о выдаче чека покупателю',
        description: 'По 54-ФЗ продавец обязан отправить покупателю электронный кассовый чек. На сайте нет информации о том, как покупатель его получит.',
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
