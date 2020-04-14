class Color {};

Color.SGR_CODES = {
  normal: '0m',
  bold: '1m',
  dim: '2m',
  italic: '3m',
  ul: '4m',
  reverse: '7m',
  strike: '9m',
  red: '31m',
  green: '32m',
  yellow: '33m',
  blue: '34m',
  magenta: '35m',
  cyan: '36m',
  white: '37m',
};

Color.format = function(style, string) {
  const colors = Array.isArray(style) ? style : [style];
  const codes = colors.map((color) => Color.SGR_CODES[color]);
  const color = false;
  codes.forEach((code, i) => {
    if(code >= 30) {
      if(color) {
        codes[i] += 10;
      }
      color = true;
    }
  });
  return `\x1b[${codes.join(';')}m${string}\x1b[0m`;
};

module.exports = Color;

