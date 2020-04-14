class Edit {

  constructor(type, aLine, bLine) {
    this.type = type;
    this.aLine = aLine;
    this.aLines = [aLine];
    this.bLine = bLine;
  }

  toString() {
    const line = this.aLine || this.bLine;
    return `${this.type}${line.text}`;
  }

};

Edit.SYMBOLS = {
  eql: ' ',
  ins: '+',
  del: '-',
};

module.exports = Edit;

