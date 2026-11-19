const NS = 'http://www.w3.org/2000/svg';

export function svgEl(tag, attrs = {}, parent) {
  const node = document.createElementNS(NS, tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
  parent?.append(node);
  return node;
}

export function icon(name, { label = '', inline = false, className } = {}) {
  const weather = name.startsWith('wi-');
  const svg = svgEl('svg', { class: className ?? (weather ? 'wi' : 'i'), viewBox: weather ? '0 0 64 64' : '0 0 24 24', focusable: 'false' });
  if (label) {
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', label);
  } else {
    svg.setAttribute('aria-hidden', 'true');
  }
  const symbol = inline ? document.getElementById(name) : null;
  if (symbol) {
    for (const child of symbol.children) svg.append(child.cloneNode(true));
  } else {
    svgEl('use', { href: `#${name}` }, svg);
  }
  return svg;
}

export function html(tag, { className, text, attrs } = {}, children = []) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  if (attrs) for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
  node.append(...children);
  return node;
}
