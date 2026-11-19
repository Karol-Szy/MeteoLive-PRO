import { icon, html } from './ikony.js';

const AI_CREDIT = 'obraz wygenerowany przez AI – ChatGPT (OpenAI)';

const ITEMS = [
  { file: 'zorza-nad-fiordem.webp', title: 'Zorza polarna', subtitle: 'Zorza nad fiordem i samotną chatą', description: 'Naładowane cząstki ze Słońca pobudzają gazy atmosferyczne do świecenia.', alt: 'Zielono-fioletowa zorza polarna nad ośnieżonymi górami i fiordem, na brzegu oświetlona czerwona chata', credit: AI_CREDIT },
  { file: 'burza-nad-jeziorem.webp', title: 'Energia burzy', subtitle: 'Burzowa noc nad górskim jeziorem', description: 'W chmurze burzowej gromadzi się ładunek elektryczny, który prowadzi do wyładowań.', alt: 'Kilka rozgałęzionych błyskawic z fioletowych chmur nad ośnieżonymi górami, odbitych w jeziorze', credit: AI_CREDIT },
  { file: 'burzowa-noc.webp', title: 'Deszczowy rytm', subtitle: 'Burzowa noc', description: 'Krople wody spadają z chmur, gdy stają się wystarczająco ciężkie.', alt: 'Ulewa nocą na mokrej drodze oświetlonej latarniami, krople spadają z liści, w tle błyskawica w chmurach', credit: AI_CREDIT },
  { file: 'mglista-droga.webp', title: 'Poranna mgła', subtitle: 'Mglista droga', description: 'Mgła to chmura powstająca bardzo blisko ziemi, zwykle w chłodny i bezwietrzny poranek.', alt: 'Wschód słońca nad doliną wypełnioną mgłą, mokra droga i liście z kroplami rosy', credit: AI_CREDIT },
  { file: 'zloty-swit.webp', title: 'Złota godzina', subtitle: 'Złoty świt', description: 'Gdy słońce jest nisko, jego światło przechodzi przez grubszą warstwę powietrza i nabiera ciepłych barw.', alt: 'Wschodzące słońce nad górską łąką, ośnieżone szczyty w złotym świetle i mgła w dolinach', credit: AI_CREDIT, focus: 'center 30%' }
];

export function initGallery() {
  const grid = document.getElementById('galleryGrid');
  const modal = document.getElementById('galleryModal');
  const dialog = modal.querySelector('.modal-dialog');
  const image = document.getElementById('modalImage');
  const title = document.getElementById('modalTitle');
  const description = document.getElementById('modalDescription');
  const credit = document.getElementById('modalCredit');
  const count = document.getElementById('modalCount');
  const close = document.getElementById('modalClose');
  const prev = document.getElementById('modalPrev');
  const next = document.getElementById('modalNext');
  const tiles = [];
  let index = 0;
  let lastFocus = null;
  let startX = 0;

  const canAnimate = () => !document.documentElement.classList.contains('motion-off') && !matchMedia('(prefers-reduced-motion: reduce)').matches;
  const viewTransitions = () => canAnimate() && typeof document.startViewTransition === 'function';
  const thumb = i => tiles[i].querySelector('img');
  const transition = update => {
    const run = document.startViewTransition(update);
    run.ready.catch(() => {});
    return run.finished;
  };

  ITEMS.forEach((item, i) => {
    const tile = html('button', { className: 'gallery-tile', attrs: { type: 'button', 'aria-label': `Otwórz obraz ${i + 1} z ${ITEMS.length}: ${item.title}` } });
    const picture = html('img', { attrs: { src: `media/galeria/${item.file}`, alt: item.alt, loading: 'lazy', decoding: 'async' } });
    if (item.focus) picture.style.objectPosition = item.focus;
    const caption = html('span', { className: 'gallery-caption' }, [
      html('span', {}, [html('strong', { text: item.title }), html('small', { text: item.subtitle })]),
      html('span', { className: 'icon-btn' }, [icon('i-arrow')])
    ]);
    tile.append(picture, caption);
    tile.addEventListener('click', () => open(i));
    tiles.push(tile);
    grid.append(tile);
  });

  function render() {
    const item = ITEMS[index];
    image.src = `media/galeria/${item.file}`;
    image.alt = item.alt;
    title.textContent = item.title;
    description.textContent = item.description;
    if (credit) {
      credit.textContent = item.credit ? `Źródło: ${item.credit}` : '';
      credit.hidden = !item.credit;
    }
    count.textContent = `${index + 1} / ${ITEMS.length}`;
  }

  function open(i) {
    lastFocus = document.activeElement;
    index = i;
    const show = () => {
      thumb(i).style.viewTransitionName = '';
      image.style.viewTransitionName = 'gallery-photo';
      render();
      modal.hidden = false;
      document.body.style.overflow = 'hidden';
      close.focus();
    };
    if (viewTransitions()) {
      tiles.forEach((_, k) => { thumb(k).style.viewTransitionName = ''; });
      thumb(i).style.viewTransitionName = 'gallery-photo';
      transition(show);
    } else {
      show();
    }
  }

  function hide() {
    const target = thumb(index);
    const done = () => {
      modal.hidden = true;
      document.body.style.overflow = '';
      image.style.viewTransitionName = '';
      target.style.viewTransitionName = 'gallery-photo';
      lastFocus?.focus();
    };
    if (viewTransitions()) {
      transition(done).finally(() => { target.style.viewTransitionName = ''; });
    } else {
      done();
      target.style.viewTransitionName = '';
    }
  }

  function move(delta) {
    index = (index + delta + ITEMS.length) % ITEMS.length;
    const direction = delta > 0 ? 'next' : 'prev';
    if (viewTransitions()) {
      document.documentElement.dataset.galleryDir = direction;
      transition(render).finally(() => { delete document.documentElement.dataset.galleryDir; });
      return;
    }
    render();
    if (canAnimate()) {
      image.classList.remove('slide-next', 'slide-prev');
      void image.offsetWidth;
      image.classList.add(`slide-${direction}`);
    }
  }

  close.addEventListener('click', hide);
  prev.addEventListener('click', () => move(-1));
  next.addEventListener('click', () => move(1));
  modal.addEventListener('click', event => { if (event.target.dataset.close) hide(); });
  modal.addEventListener('keydown', event => {
    if (event.key === 'Escape') hide();
    else if (event.key === 'ArrowLeft') { event.preventDefault(); move(-1); }
    else if (event.key === 'ArrowRight') { event.preventDefault(); move(1); }
    else if (event.key === 'Tab') {
      const focusable = [close, prev, next];
      const at = focusable.indexOf(document.activeElement);
      if (event.shiftKey && at <= 0) { event.preventDefault(); next.focus(); }
      else if (!event.shiftKey && at === focusable.length - 1) { event.preventDefault(); close.focus(); }
    }
  });
  dialog.addEventListener('touchstart', event => { startX = event.changedTouches[0].clientX; }, { passive: true });
  dialog.addEventListener('touchend', event => {
    const dx = event.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 60) move(dx < 0 ? 1 : -1);
  }, { passive: true });
}
