const crypto = require('crypto');
const fs = require('fs');

class Checksum {

  constructor(file) {
    // file is file descryptor
    this.file = file;
    this.digest = crypto.createHash('sha1');
  }

  read(size) {
    const data = Buffer.alloc(size);
    // last params indicates how many bytes will be read
    // this is different of how buf.copy behaves
    // secondly this.file is file descriptor so internally
    // is seeking its position
    fs.readSync(this.file, data, 0, size);
    if(data.length !== size) {
      throw 'Unexpected end-of-file while reading index';
    }
    this.digest.update(data);
    return data;
  }

  verifyChecksum() {
    const storedSum = Buffer.alloc(Checksum.CHECKSUM_SIZE);
    fs.readSync(this.file, storedSum, 0, Checksum.CHECKSUM_SIZE);
    // interpret storedSum buffer contents as hex string
    const storedSumString = storedSum.toString('hex');
    // curSumString is a hex string
    const curSumString = this.digest.digest('hex');
    if(storedSumString !== curSumString) {
      throw `Checksum ${curSumString} does not match value stored on disk: ${storedSumString}`;
    }
  }

  write(data) {
    //console.log('writing', data);
    fs.writeSync(this.file, data);
    this.digest.update(data)
  }

  writeChecksum() {
    const digest = this.digest.digest('hex');
    //console.log('writeChecksum', digest);
    fs.writeSync(this.file, Buffer(digest, 'hex'));
  }

};

Checksum.CHECKSUM_SIZE = 20;

module.exports = Checksum;

