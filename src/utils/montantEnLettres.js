const UNITS = [
  'zero',
  'un',
  'deux',
  'trois',
  'quatre',
  'cinq',
  'six',
  'sept',
  'huit',
  'neuf',
];

const TEENS = [
  'dix',
  'onze',
  'douze',
  'treize',
  'quatorze',
  'quinze',
  'seize',
  'dix-sept',
  'dix-huit',
  'dix-neuf',
];

function under100(n) {
  if (n < 10) return UNITS[n];
  if (n < 20) return TEENS[n - 10];
  if (n < 70) {
    const tens = Math.floor(n / 10);
    const unit = n % 10;
    if (unit === 0) return ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante'][tens];
    if (unit === 1) return `${['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante'][tens]}-et-un`;
    return `${['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante'][tens]}-${UNITS[unit]}`;
  }
  if (n < 80) {
    const unit = n - 60;
    if (unit === 11) return 'soixante-et-onze';
    return `soixante-${TEENS[unit - 10]}`;
  }
  if (n < 100) {
    const unit = n - 80;
    if (unit === 0) return 'quatre-vingts';
    if (unit === 1) return 'quatre-vingt-un';
    return `quatre-vingt-${UNITS[unit]}`;
  }
  return '';
}

function under1000(n, feminine = false) {
  if (n === 0) return '';
  if (n < 100) return under100(n);

  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  let prefix = '';

  if (hundreds === 1) {
    prefix = 'cent';
  } else {
    prefix = `${UNITS[hundreds]} cent`;
    if (rest === 0) prefix += 's';
  }

  if (!rest) return prefix;
  return `${prefix} ${under100(rest)}`.trim();
}

function integerToFrench(n) {
  if (n === 0) return 'zero';

  const scales = [
    { value: 1_000_000_000, label: 'milliard', plural: 'milliards' },
    { value: 1_000_000, label: 'million', plural: 'millions' },
    { value: 1_000, label: 'mille', plural: 'mille' },
  ];

  let remaining = n;
  const parts = [];

  scales.forEach(({ value, label, plural }) => {
    if (remaining < value) return;
    const count = Math.floor(remaining / value);
    remaining %= value;

    if (value === 1_000) {
      if (count === 1) {
        parts.push('mille');
      } else {
        parts.push(`${integerToFrench(count)} mille`);
      }
      return;
    }

    const scaleLabel = count > 1 ? plural : label;
    if (count === 1) {
      parts.push(`un ${scaleLabel}`);
    } else {
      parts.push(`${integerToFrench(count)} ${scaleLabel}`);
    }
  });

  if (remaining > 0) {
    parts.push(under1000(remaining));
  }

  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

export function montantEnLettresFcfa(amount) {
  const value = Math.round(Number(amount) || 0);
  const words = integerToFrench(value);
  const label = value > 1 ? 'francs CFA TTC' : 'franc CFA TTC';
  const phrase = `${words} ${label}`;
  return phrase.charAt(0).toUpperCase() + phrase.slice(1);
}
