import { searchPlaces } from './weather-data.js';
import { icon, html } from './ikony.js';

export function initSearch(onSelect) {
  const input = document.getElementById('searchInput');
  const list = document.getElementById('searchList');
  let results = [];
  let active = -1;
  let controller = null;
  let timer = 0;

  function close() {
    list.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
    active = -1;
  }

  function message(text) {
    list.replaceChildren(html('li', { className: 'search-empty', text, attrs: { role: 'option', 'aria-disabled': 'true' } }));
    list.hidden = false;
    input.setAttribute('aria-expanded', 'true');
  }

  function highlight(index) {
    active = index;
    [...list.children].forEach((item, i) => item.setAttribute('aria-selected', String(i === index)));
    const option = list.children[index];
    if (option) {
      input.setAttribute('aria-activedescendant', option.id);
      option.scrollIntoView({ block: 'nearest' });
    }
  }

  function choose(index) {
    const place = results[index];
    if (!place) return;
    input.value = '';
    close();
    onSelect(place);
  }

  function render(source) {
    if (!results.length) {
      message('Brak wyników — spróbuj innej nazwy.');
      return;
    }
    list.replaceChildren(...results.map((place, i) => {
      const where = [place.region, place.country].filter(Boolean).join(', ');
      const option = html('li', { className: 'search-option', attrs: { id: `searchOption${i}`, role: 'option', 'aria-selected': 'false' } }, [
        icon('i-pin'),
        html('span', {}, [html('strong', { text: place.name }), html('small', { text: where })])
      ]);
      option.addEventListener('pointerdown', event => {
        event.preventDefault();
        choose(i);
      });
      return option;
    }));
    if (source === 'demo') list.append(html('li', { className: 'search-empty', text: 'Tryb offline: wyniki tylko z listy miast demonstracyjnych.', attrs: { role: 'option', 'aria-disabled': 'true' } }));
    list.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    active = -1;
  }

  async function run(query) {
    controller?.abort();
    controller = new AbortController();
    message('Szukam…');
    try {
      const response = await searchPlaces(query, controller.signal);
      results = response.results;
      render(response.source);
    } catch (error) {
      if (error.name !== 'AbortError') message('Nie udało się wyszukać. Spróbuj ponownie.');
    }
  }

  input.addEventListener('input', () => {
    clearTimeout(timer);
    const query = input.value.trim();
    if (query.length < 2) {
      controller?.abort();
      results = [];
      close();
      return;
    }
    timer = setTimeout(() => run(query), 280);
  });

  input.addEventListener('keydown', event => {
    const count = results.length;
    if (event.key === 'ArrowDown' && count) {
      event.preventDefault();
      if (list.hidden) render();
      highlight((active + 1) % count);
    } else if (event.key === 'ArrowUp' && count) {
      event.preventDefault();
      highlight((active - 1 + count) % count);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (!list.hidden && count) choose(active >= 0 ? active : 0);
    } else if (event.key === 'Escape') {
      if (!list.hidden) {
        event.preventDefault();
        close();
      } else {
        input.value = '';
      }
    }
  });

  input.addEventListener('blur', close);

  document.addEventListener('keydown', event => {
    const typing = event.target.closest?.('input, textarea, select, [contenteditable="true"]');
    if (event.key === '/' && !typing && !event.ctrlKey && !event.metaKey) {
      event.preventDefault();
      input.focus();
    }
  });
}
