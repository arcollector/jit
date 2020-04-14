const crypto = require('crypto');

module.exports = class {

  constructor(input) {
    this.input = input;
    this.digest = crypto.createHash('sha1');
    this.offset = 0;
    this.buffer = this.newByteString();
    this.capture = null;
  }

  read(size) {
    const data = this.readBuffered(size);
    this.updateState(data);
    return data;
  }

  readByte() {
    this.read(1).bytes()[0];
  }

  updateState(data) {
    if(!this.capture) {
      this.digest.update(data);
    }
    this.offset += data.length;
    if(this.capture) {
      this.capture = Buffer.concat([this.capture, data]);
    }
  } 

  verifyChecksum() {
    if(this.input.read(20) !== this.digest.digest('hex')) {
      const err = new Error(
        'Checksum does not match value read from pack'
      );
      err.code = 'InvalidPack';
      throw err;
    }
  }

  newByteString() {
    return Buffer.from('');
  }

  doCapture(cb) {
    this.capture = this.newByteString();
    const result = Buffer.concat([cb(), this.capture]);

    this.digest.update(this.capture);
    this.capture = null;

    return result;
  }

  seek(amount, whence) {
    if(amount >= 0) {
      return;
    }
    const data = this.capture.slice(amount, -1);
    this.buffer = Buffer.concat([data, this.buffer]);
    this.offset += amount;
  }

  readBuffered(size, block = true) {
    let fromBuf = this.buffer.slice(0, size);
    const needed = size - fromBuf.length;
    const fromIO = this.input.read(needed);
    fromBuf = Buffer.concat([fromBuf, fromIO]);
    return fromBuf;
  }


};
