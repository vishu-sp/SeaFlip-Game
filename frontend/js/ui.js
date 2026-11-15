import { ART } from './art.js';

export const $ = (id) => document.getElementById(id);

export function show(id) {
  document.querySelectorAll('.screen').forEach((screen) => {
    screen.classList.toggle('active', screen.id === id);
  });

  document.dispatchEvent(new CustomEvent('screenchange', { detail: id }));
  $(id).querySelector('h1, h2')?.focus();
}

export function notice(message) {
  $('notice').textContent = message;
}

export function renderCards(run, onCardClick) {
  const grid = $('grid');
  grid.style.gridTemplateColumns = `repeat(${run.size}, 1fr)`;

  // Reuse cards so the CSS flip animation continues between server updates.
  if (grid.children.length !== run.cards.length) {
    grid.replaceChildren();

    for (const card of run.cards) {
      const button = document.createElement('button');
      button.className = 'card';
      button.innerHTML = [
        '<span class="inner">',
        '<span class="face front"><span>✦</span></span>',
        '<span class="face back"></span>',
        '</span>',
      ].join('');
      button.addEventListener('click', () => onCardClick(card.index));
      grid.append(button);
    }
  }

  run.cards.forEach((card, index) => {
    const button = grid.children[index];
    button.className = 'card'
      + (card.symbol ? ' up' : '')
      + (card.matched ? ' done' : '');
    button.disabled = card.matched;
    button.setAttribute(
      'aria-label',
      card.symbol ? `${card.symbol} card` : `Reveal card ${index + 1}`,
    );

    if (card.symbol) {
      button.querySelector('.back').innerHTML = ART[card.symbol];
    }
  });
}

export function table(id, headers, rows) {
  const tableElement = $(id);
  tableElement.replaceChildren();

  [headers, ...rows].forEach((row, rowIndex) => {
    const tableRow = document.createElement('tr');

    row.forEach((value) => {
      const cell = document.createElement(rowIndex === 0 ? 'th' : 'td');
      cell.textContent = String(value);
      tableRow.append(cell);
    });

    tableElement.append(tableRow);
  });
}
