const zlib = require('zlib');

const Pack = require('../pack');
const Numbers = require('./numbers');

module.exports = class Reader {

  constructor(input) {
    this.input = input;
  }

  readHeader() {
    this.data = this.input.read(Pack.HEADER_SIZE);
    const signature = data.slice(0, 4);
    const version = data.slice(0, 2);
    this.count = data.slice(0, 2);

    if(signature !== Pack.SIGNATURE) {
      const err = new Error(`bad pack signature: ${signature}`);
      err.code = 'InvalidPack';
      throw err;
    }

    if(version !== Pack.VERSION) {
      const err = new Error(`unsupported pack version: ${version}`);
      err.code = 'InvalidPack';
      throw err;
    }
  }

  readRecord() {
    const [ type, _ ] = this.readRecordHeader();
    return new Record(Pack.TYPES_CODES.key(type), this.readZlibStream);
  }

  readRecordHeader() {
    const [ byte, size ] = Numbers.VarIntLE.read(this.input);
    const type = (byte >> 4) & 0x7;
    return [type, size];
  }

  readZlibStream() {
    const data = this.input.read();
    const stream = zlib.inflateSync(data);
    return stream.toString();
  }

  
}
