import { types } from 'util'; // Not needed, let's keep it simple

export const COLOR_GROUPS: { [key: string]: { label: string; css: string } } = {
  black: { label: 'Black', css: '#000000' },
  white: { label: 'White', css: '#ffffff' },
  gray: { label: 'Gray', css: '#808080' },
  brown: { label: 'Brown', css: '#8B4513' },
  tan: { label: 'Tan', css: '#C19A6B' },
  green: { label: 'Green', css: '#4A7C59' },
  blue: { label: 'Blue', css: '#2F5BA8' },
  red: { label: 'Red', css: '#D62828' },
  yellow: { label: 'Yellow', css: '#E7B928' },
  pink: { label: 'Pink', css: '#E49DB0' },
  purple: { label: 'Purple', css: '#7D4E9C' },
  orange: { label: 'Orange', css: '#E07A41' }
};

export const COLOR_NAME_TO_GROUP: { [key: string]: string } = {
  camel: 'tan', khaki: 'tan', beige: 'tan', caramel: 'tan', sand: 'tan', taupe: 'tan', biscuit: 'tan', 'light brown': 'tan', tan: 'tan',
  charcoal: 'gray', ash: 'gray', slate: 'gray', stone: 'gray', pewter: 'gray', graphite: 'gray', silver: 'gray', 'light gray': 'gray', 'dark gray': 'gray',
  olive: 'green', moss: 'green', sage: 'green', forest: 'green', emerald: 'green', pine: 'green', mint: 'green', lime: 'green', jade: 'green',
  navy: 'blue', cobalt: 'blue', aqua: 'blue', teal: 'blue', sky: 'blue', denim: 'blue', royal: 'blue', 'light blue': 'blue',
  maroon: 'red', wine: 'red', cranberry: 'red', berry: 'red', ruby: 'red', cherry: 'red', coral: 'orange',
  gold: 'yellow', mustard: 'yellow', lemon: 'yellow', butter: 'yellow', amber: 'orange', pumpkin: 'orange', peach: 'orange', copper: 'orange',
  lavender: 'purple', violet: 'purple', plum: 'purple', lilac: 'purple', eggplant: 'purple', mauve: 'purple',
  rose: 'pink', blush: 'pink', fuchsia: 'pink', magenta: 'pink',
  chocolate: 'brown', mocha: 'brown', espresso: 'brown', coffee: 'brown'
};

export function normalizeColorLabel(val: string | null | undefined): string {
  if (!val) return '';
  return String(val).toLowerCase().trim();
}

export function getColorGroupKey(colorName: string): string {
  const key = normalizeColorLabel(colorName);
  if (!key) return '';
  if (COLOR_GROUPS[key]) return key;
  if (COLOR_NAME_TO_GROUP[key]) return COLOR_NAME_TO_GROUP[key];

  if (key.includes('black')) return 'black';
  if (key.includes('white') || key.includes('cream') || key.includes('ivory')) return 'white';
  if (key.includes('gray') || key.includes('grey') || key.includes('ash') || key.includes('charcoal') || key.includes('slate') || key.includes('stone')) return 'gray';
  if (key.includes('tan') || key.includes('beige') || key.includes('camel') || key.includes('khaki') || key.includes('sand') || key.includes('taupe')) return 'tan';
  if (key.includes('brown') || key.includes('chocolate') || key.includes('mocha') || key.includes('coffee')) return 'brown';
  if (key.includes('green') || key.includes('olive') || key.includes('sage') || key.includes('moss') || key.includes('forest') || key.includes('jade') || key.includes('mint')) return 'green';
  if (key.includes('blue') || key.includes('navy') || key.includes('aqua') || key.includes('teal') || key.includes('denim') || key.includes('sky') || key.includes('royal')) return 'blue';
  if (key.includes('red') || key.includes('maroon') || key.includes('wine') || key.includes('ruby') || key.includes('cherry') || key.includes('berry')) return 'red';
  if (key.includes('yellow') || key.includes('gold') || key.includes('mustard') || key.includes('lemon') || key.includes('butter')) return 'yellow';
  if (key.includes('pink') || key.includes('rose') || key.includes('blush') || key.includes('magenta') || key.includes('fuchsia')) return 'pink';
  if (key.includes('purple') || key.includes('violet') || key.includes('plum') || key.includes('lilac') || key.includes('mauve') || key.includes('eggplant')) return 'purple';
  if (key.includes('orange') || key.includes('coral') || key.includes('amber') || key.includes('pumpkin') || key.includes('peach') || key.includes('copper')) return 'orange';

  return 'gray';
}

export function getColorGroupLabel(colorName: string): string {
  const groupKey = getColorGroupKey(colorName);
  return COLOR_GROUPS[groupKey] ? COLOR_GROUPS[groupKey].label : String(colorName);
}

export function mapColorToCss(colorName: string): string {
  if (!colorName) return '#ccc';
  const key = getColorGroupKey(colorName);
  if (COLOR_GROUPS[key]) return COLOR_GROUPS[key].css;
  return '#ccc';
}
