const LAWS_DATA = [
  { icon: '🔒', title: '152-ФЗ Персональные данные', desc: 'Политика конфиденциальности, согласия, чекбоксы в формах', fine: 'до 700 000 ₽' },
  { icon: '🍪', title: '152-ФЗ Cookie-файлы', desc: 'Баннер согласия, кнопка отклонения, загрузка аналитики', fine: 'до 700 000 ₽' },
  { icon: '🌍', title: '242-ФЗ Локализация данных', desc: 'Google Analytics, Meta Pixel, reCAPTCHA, Hotjar и другие', fine: 'до 6 000 000 ₽' },
  { icon: '📋', title: '149-ФЗ + ЗоЗПП Реквизиты', desc: 'Контакты, ИНН, ОГРН, адрес организации', fine: 'до 500 000 ₽' },
  { icon: '📣', title: '38-ФЗ Маркировка рекламы', desc: 'Токен ERID, пометка «Реклама», данные рекламодателя', fine: 'до 1 000 000 ₽' },
  { icon: '🛒', title: '54-ФЗ Онлайн-касса', desc: 'ОФД при наличии оплаты, электронный чек покупателю', fine: '100% суммы' },
  { icon: '💬', title: '41-ФЗ Мессенджеры', desc: 'Виджеты Telegram, WhatsApp, Viber, ссылки на Meta', fine: 'до 500 000 ₽' },
  { icon: '🏪', title: 'ЗоЗПП Интернет-магазин', desc: 'Условия возврата, доставка, подписки, цены в рублях', fine: 'до 100 000 ₽' },
  { icon: '🇷🇺', title: '53-ФЗ Русский язык', desc: 'Иностранные слова в навигации, кнопках и тексте сайта', fine: 'до 200 000 ₽' },
];

const PROGRESS_MESSAGES = [
  'Загружаем страницу...',
  'Анализируем HTML-структуру...',
  'Ищем формы и согласия...',
  'Проверяем внешние скрипты...',
  'Анализируем cookie-баннер...',
  'Проверяем реквизиты организации...',
  'Анализируем рекламные блоки...',
  'Проверяем иностранные слова в тексте...',
  'Считаем сумму штрафов...',
];

document.addEventListener('DOMContentLoaded', () => {
  renderLawsGrid();
  document.getElementById('urlInput').addEventListener('keypress', e => {
    if (e.key === 'Enter') startCheck();
  });
});

function renderLawsGrid() {
  document.getElementById('lawsGrid').innerHTML = LAWS_DATA.map(l => `
    <div class="law-card">
      <div class="law-icon">${l.icon}</div>
      <div class="law-title">${l.title}</div>
      <div class="law-desc">${l.desc}</div>
      <div class="law-fine">${l.fine}</div>
    </div>
  `).join('');
}

async function startCheck() {
  const input = document.getElementById('urlInput');
  let url = input.value.trim();
  if (!url) {
    input.focus();
    input.classList.add('shake');
    setTimeout(() => input.classList.remove('shake'), 500);
    return;
  }
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
    input.value = url;
  }

  showLoading(url);
  try {
    const res = await fetch('/api/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    const data = await res.json();
    if (!res.ok || data.error) { showError(data.error || 'Не удалось проверить сайт'); return; }
    showResults(data);
  } catch (err) {
    showError('Ошибка соединения с сервером: ' + err.message);
  }
}

function showLoading(url) {
  hideAll();
  document.getElementById('loadingSection').style.display = 'block';
  document.getElementById('loadingUrl').textContent = url;

  let msgIdx = 0;
  let progress = 5;
  document.getElementById('progressFill').style.width = '5%';

  const msgInterval = setInterval(() => {
    msgIdx = (msgIdx + 1) % PROGRESS_MESSAGES.length;
    document.getElementById('loadingText').textContent = PROGRESS_MESSAGES[msgIdx];
  }, 5000);

  const progressInterval = setInterval(() => {
    progress = Math.min(progress + Math.random() * 2.5, 90);
    document.getElementById('progressFill').style.width = progress + '%';
  }, 600);

  window._loadingIntervals = [msgInterval, progressInterval];
}

function stopLoading() {
  if (window._loadingIntervals) {
    window._loadingIntervals.forEach(clearInterval);
    window._loadingIntervals = null;
  }
  document.getElementById('progressFill').style.width = '100%';
}

function showResults(data) {
  stopLoading();
  hideAll();
  document.getElementById('resultsSection').style.display = 'block';

  const count = data.summary.violations_count;
  const countEl = document.getElementById('summaryCount');
  const amountEl = document.getElementById('summaryAmount');
  const boxEl = document.getElementById('summaryBox');

  countEl.textContent = count === 0 ? '✅ Нарушений не найдено' : `⚠️ Найдено нарушений: ${count}`;

  if (count === 0) {
    amountEl.textContent = 'Явных нарушений не обнаружено';
    document.getElementById('summaryLabel').style.display = 'none';
    boxEl.classList.add('summary-ok');
  } else {
    const min = formatMoney(data.summary.fine_total_min);
    const max = formatMoney(data.summary.fine_total_max);
    amountEl.textContent = `от ${min} до ${max}`;
    boxEl.classList.add('summary-danger');
  }

  const violList = document.getElementById('violationsList');
  if (data.violations.length > 0) {
    violList.innerHTML = '<h3 class="violations-title">🚨 Найденные нарушения</h3>' +
      data.violations.map(renderViolation).join('');
  }

  const passedList = document.getElementById('passedList');
  if (data.passed.length > 0) {
    passedList.innerHTML = data.passed.map(p => `
      <div class="passed-item">
        <span class="passed-icon">✓</span>
        <div>
          <div class="passed-item-title">${esc(p.title)}</div>
          <div class="passed-item-desc">${esc(p.description)}</div>
        </div>
      </div>
    `).join('');
    document.getElementById('passedSection').style.display = 'block';
  }
}

function renderViolation(v) {
  const fineStr = v.fine_max > 0
    ? `${formatMoney(v.fine_min)} — ${formatMoney(v.fine_max)}`
    : (v.warning || 'Уголовная ответственность');
  const cls = v.severity === 'critical' ? 'critical' : 'warning';
  const icon = v.severity === 'critical' ? '🔴' : '🟡';

  return `
    <div class="violation-card ${cls}">
      <div class="violation-header">
        <div class="violation-title">${icon} ${esc(v.title)}</div>
        <div class="violation-fine">${esc(fineStr)}</div>
      </div>
      <div class="violation-law">${esc(v.law)} · ${esc(v.article)}</div>
      <div class="violation-description">${esc(v.description)}</div>
      <div class="violation-fix"><span class="fix-label">Как исправить:</span> ${esc(v.how_to_fix)}</div>
    </div>
  `;
}

function showError(msg) {
  stopLoading();
  hideAll();
  document.getElementById('errorSection').style.display = 'block';
  document.getElementById('errorMessage').textContent = msg;
}

function resetForm() {
  hideAll();
  document.getElementById('summaryBox').classList.remove('summary-danger', 'summary-ok');
  document.getElementById('summaryLabel').style.display = '';
  document.getElementById('violationsList').innerHTML = '';
  document.getElementById('passedList').innerHTML = '';
  document.getElementById('progressFill').style.width = '0%';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function hideAll() {
  ['loadingSection', 'resultsSection', 'errorSection'].forEach(id => {
    document.getElementById(id).style.display = 'none';
  });
}

function formatMoney(n) {
  if (!n && n !== 0) return '?';
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(n);
}

async function downloadPDF() {
  const btn = document.getElementById('downloadPdfBtn');
  btn.textContent = '⏳ Формируем PDF...';
  btn.disabled = true;

  try {
    if (!window.html2canvas) {
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
    }
    if (!window.jspdf) {
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
    }

    btn.style.visibility = 'hidden';

    const section = document.getElementById('resultsSection');
    const canvas = await html2canvas(section, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#f8fafc'
    });

    btn.style.visibility = '';

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('p', 'mm', 'a4');

    const margin = 10;
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const contentW = pageW - margin * 2;
    const contentH = (canvas.height * contentW) / canvas.width;
    const totalPages = Math.ceil(contentH / (pageH - margin * 2));

    for (let i = 0; i < totalPages; i++) {
      if (i > 0) pdf.addPage();
      pdf.addImage(
        canvas.toDataURL('image/png'), 'PNG',
        margin,
        margin - i * (pageH - margin * 2),
        contentW,
        contentH
      );
    }

    const rawUrl = document.getElementById('urlInput').value || 'site';
    const host = rawUrl.replace(/https?:\/\//, '').replace(/[\/\\?#]/g, '_').slice(0, 30);
    const date = new Date().toISOString().slice(0, 10);
    pdf.save(`LawScan_${host}_${date}.pdf`);

  } catch (err) {
    alert('Не удалось создать PDF: ' + err.message);
  } finally {
    btn.textContent = '⬇ Скачать PDF';
    btn.disabled = false;
    btn.style.visibility = '';
  }
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error('Не удалось загрузить: ' + src));
    document.head.appendChild(s);
  });
}

function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
