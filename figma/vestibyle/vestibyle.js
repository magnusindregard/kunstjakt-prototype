// Shared runtime for the vestibule-screen prototypes. Each page only sets
// data-variant on <body>; the markup, the exhibition loop and the clock live
// here, and vestibyle.css places the pieces per variant.
//
// URL parameters, handy when testing:
//   ?time=14:50  freeze the clock at a time of day, to see past events dim
//   ?slide=8     seconds per exhibition (prod uses 13)
//   ?events=8    seconds per page of events, on pages with data-paginate
//                (defaults to the same 13 as the exhibitions)

(function () {
  // Straight from https://www.nasjonalmuseet.no/api/vestibule/exhibitions.
  // Prod has no subtitles on these, so the category lines stay hidden.
  const PROD = 'https://www.nasjonalmuseet.no';
  const EXHIBITIONS = [
    {
      titleNo: 'Samlingen', titleEn: 'The Collection',
      subTitleNo: null, subTitleEn: null,
      floorLabel: '1/2', floorTitleNo: 'Etasje', floorTitleEn: 'Floor',
      image: PROD + '/contentassets/db7f343ac5ad4de5bcafe14d73f8cee3/rom-061-utstillingsdokumenatsjon-006.jpg',
    },
    {
      titleNo: 'Søylerommet', titleEn: 'The Pillars',
      subTitleNo: null, subTitleEn: null,
      floorLabel: '2', floorTitleNo: 'Etasje', floorTitleEn: 'Floor',
      image: PROD + '/contentassets/db7f343ac5ad4de5bcafe14d73f8cee3/soylerommet-pressebilder--6-custom.jpg',
    },
    {
      titleNo: 'Malerin̶n̶e̶', titleEn: 'W̶o̶m̶a̶n̶ ̶Painter',
      subTitleNo: null, subTitleEn: null,
      floorLabel: '3', floorTitleNo: 'Lyshallen', floorTitleEn: 'Light Hall',
      image: PROD + '/globalassets/bilder/utstillinger/nasjonalmuseet/2026/malerinne/gabinetto-fotografico-delle-gallerie-degli-uffizi_nett2.jpg',
    },
  ];

  // Dummy programme from the Figma sketches, plus three evening events to fill
  // a second page (the museum closes at 20.00). An event counts as over once
  // its last session has ended.
  const EVENTS = [
    { time: '12.00–12.10 og 12.30–12.40', type: 'Omvisning', title: 'Et øyeblikk. Ett verk på 10 minutter.', info: 'Påmelding i infoskranken' },
    { time: '12.00–13.30 og 14.30–16.00', type: 'Familieverksted', title: 'Urskogen Silva', info: 'Påmelding i infoskranken' },
    { time: '14.00–14.45', type: 'Omvisning', title: 'Kunstaktivisme', info: 'Påmelding i infoskranken' },
    { time: '15.00–15.45', type: 'Omvisning', title: 'Enkle hytter, rike liv: lærdommer fra Zappfe og Næss', info: 'Påmelding i infoskranken' },
    { time: '16.00–16.45', type: 'Omvisning', title: 'Malerin̶n̶e̶', info: 'Påmelding i infoskranken' },
    { time: '17.00–17.45', type: 'Omvisning', title: 'Søylerommet', info: 'Påmelding i infoskranken' },
    { time: '18.00–18.45', type: 'Kunstnersamtale', title: 'Hvem fikk kalle seg maler?', info: 'Auditoriet. Gratis med billett' },
    { time: '19.00–19.40', type: 'Konsert', title: 'Kveldskonsert i Lyshallen', info: 'Fri entré' },
  ];

  // Pages marked data-paginate show every event, five to a page, and step
  // through the pages; the others show only the first five.
  const PAGE_SIZE = 5;
  const PAGINATE = document.body.hasAttribute('data-paginate');
  const shownEvents = PAGINATE ? EVENTS : EVENTS.slice(0, PAGE_SIZE);
  const pageCount = Math.ceil(shownEvents.length / PAGE_SIZE);

  const params = new URLSearchParams(location.search);
  const SLIDE_SECONDS = Number(params.get('slide')) || 13;
  const PAGE_SECONDS = Number(params.get('events')) || SLIDE_SECONDS;
  const FROZEN_TIME = /^\d{1,2}[:.]\d{2}$/.test(params.get('time') || '') ? params.get('time') : null;

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // "1/2" + "Etasje" reads as "1. og 2. etasje"; a named floor like Lyshallen
  // keeps its name and gets the storey after it.
  function floorLines(ex) {
    const storeys = ex.floorLabel.split('/');
    const no = storeys.map((n) => n + '.').join(' og ') + ' etasje';
    const en = storeys.map((n) => n + '.').join(' and ') + ' floor';
    if (ex.floorTitleNo.toLowerCase() === 'etasje') return [no, en];
    return [ex.floorTitleNo + ', ' + no, ex.floorTitleEn + ', ' + en];
  }

  function minutesNow() {
    if (FROZEN_TIME) {
      const [h, m] = FROZEN_TIME.split(/[:.]/).map(Number);
      return h * 60 + m;
    }
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  }

  function clockText() {
    const m = minutesNow();
    return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
  }

  function lastEnd(time) {
    const stamps = time.match(/\d{1,2}[.:]\d{2}/g) || [];
    const last = stamps[stamps.length - 1];
    if (!last) return Infinity;
    const [h, m] = last.split(/[.:]/).map(Number);
    return h * 60 + m;
  }

  const variant = document.body.dataset.variant;
  const header = (no, en, cls) =>
    `<div class="col-header ${cls}"><p class="col-header__no">${no}</p><p class="col-header__en">${en}</p></div>`;

  const stage = document.createElement('div');
  stage.className = 'stage';
  stage.innerHTML = `
    <div class="rule rule--left"></div>
    <div class="rule rule--right"></div>
    <div class="rule rule--vertical"></div>
    <div class="image">${EXHIBITIONS.map((ex, i) =>
      `<img class="image__slide" data-i="${i}" src="${esc(ex.image)}" alt="">`).join('')}</div>
    <section class="exhibitions">
      <div class="exhibitions__top">
        ${header('Utstillinger', 'Exhibitions', 'col-header--exhibitions')}
        <div class="detail"></div>
      </div>
      <ul class="ex-list">${EXHIBITIONS.map((ex, i) => `
        <li class="ex-list__item" data-i="${i}">
          <span class="ex-list__no">${esc(ex.titleNo)}</span>
          <span class="ex-list__en">${esc(ex.titleEn)}</span>
        </li>`).join('')}
      </ul>
    </section>
    <aside class="events">
      ${header('Arrangementer', 'Events', 'col-header--events')}
      <ul class="events__list">${shownEvents.map((ev, i) => `
        <li class="event" data-page="${Math.floor(i / PAGE_SIZE)}" data-end="${lastEnd(ev.time)}">
          <div class="event__meta"><span>${esc(ev.time)}</span><span>${esc(ev.type)}</span></div>
          <p class="event__title">${esc(ev.title)}</p>
          <p class="event__info">${esc(ev.info)}</p>
        </li>`).join('')}
      </ul>
      ${pageCount > 1 ? `<div class="pager">${Array.from({ length: pageCount }, (_, p) =>
        `<span class="pager__item" data-page="${p}"></span>`).join('')}</div>` : ''}
    </aside>
    <div class="clock"><img class="clock__icon" src="assets/clock.svg" alt=""><span class="clock__time"></span></div>
  `;
  document.body.appendChild(stage);

  // The stage is drawn at Figma's 1926×985 and scaled to fit, which keeps the
  // proportions of the 3500×1800 screens in any browser window.
  function fit() {
    const s = Math.min(innerWidth / 1926, innerHeight / 985);
    stage.style.transform = `translate(-50%, -50%) scale(${s})`;
  }
  addEventListener('resize', fit);
  fit();

  const detail = stage.querySelector('.detail');
  const slides = stage.querySelectorAll('.image__slide');
  const items = stage.querySelectorAll('.ex-list__item');

  function renderDetail(ex) {
    const [floorNo, floorEn] = floorLines(ex);
    const category = ex.subTitleNo
      ? `<div class="detail__category"><p>${esc(ex.subTitleNo)}</p><p class="detail__muted">${esc(ex.subTitleEn || '')}</p></div>`
      : '';
    detail.innerHTML = `
      <div class="detail__floor"><span>${esc(floorNo)}</span><span class="detail__muted">${esc(floorEn)}</span></div>
      <div class="detail__titles">
        <p class="detail__title-no">${esc(ex.titleNo)}</p>
        <p class="detail__title-en">${esc(ex.titleEn)}</p>
      </div>
      ${category}`;
  }

  let current = -1;
  function show(i) {
    current = i;
    slides.forEach((el) => el.classList.toggle('is-active', Number(el.dataset.i) === i));
    items.forEach((el) => {
      const on = Number(el.dataset.i) === i;
      el.classList.remove('is-current');
      if (on) {
        // Restart the progress fill even when the same item comes round again.
        void el.offsetWidth;
        el.classList.add('is-current');
      }
    });
    detail.classList.remove('is-in');
    setTimeout(() => {
      renderDetail(EXHIBITIONS[i]);
      detail.classList.add('is-in');
    }, current === 0 && !detail.innerHTML ? 0 : 400);
  }

  stage.style.setProperty('--slide-duration', SLIDE_SECONDS + 's');
  show(0);
  setInterval(() => show((current + 1) % EXHIBITIONS.length), SLIDE_SECONDS * 1000);

  // The old event page fades out and the new one's events fade in one by one.
  // The pager reuses the exhibition list's fill, laid on its side.
  const eventList = stage.querySelector('.events__list');
  const eventItems = stage.querySelectorAll('.event');
  const pagerItems = stage.querySelectorAll('.pager__item');
  let currentPage = -1;
  function showPage(p) {
    const first = currentPage === -1;
    currentPage = p;
    pagerItems.forEach((el) => {
      el.classList.remove('is-current');
      if (Number(el.dataset.page) === p) {
        void el.offsetWidth;
        el.classList.add('is-current');
      }
    });
    eventList.classList.remove('is-in');
    setTimeout(() => {
      let n = 0;
      eventItems.forEach((el) => {
        el.hidden = Number(el.dataset.page) !== p;
        if (!el.hidden) el.style.setProperty('--i', n++);
      });
      eventList.classList.add('is-in');
    }, first ? 0 : 400);
  }

  stage.style.setProperty('--page-duration', PAGE_SECONDS + 's');
  showPage(0);
  if (pageCount > 1) setInterval(() => showPage((currentPage + 1) % pageCount), PAGE_SECONDS * 1000);

  function tick() {
    stage.querySelector('.clock__time').textContent = clockText();
    const now = minutesNow();
    stage.querySelectorAll('.event').forEach((el) => el.classList.toggle('is-past', Number(el.dataset.end) <= now));
  }
  tick();
  setInterval(tick, 1000);

  document.body.classList.add('is-ready');
  if (!variant) console.warn('vestibyle: set data-variant on <body>');
})();
