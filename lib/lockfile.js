const fs = require('fs');
const path = require('path')

module.exports = class Lockfile {

  constructor(path) {
    this.filePath = path;
    this.lockPath = `${path}.lock`;
    // this.lock is a file descriptor
    this.lock = null;
    //console.log('new lock', this.filePath);
  }

  rollback() {
    //this.raiseOnStaleLock();
    if(this.lock !== null) {
      fs.closeSync(this.lock);
      fs.unlinkSync(this.lockPath);
    }
    this.lock = null;
    //console.log('closing lock', this.filePath);
  }

  holdForUpdate() {
    // Open file for reading and writing.
    // The file is created (if it does not exist) 
    // but fails if the path exists.
    try {
      //console.log('holdForUpdate', this.lockPath);
      //console.log(fs.readdirSync(path.dirname(this.filePath)));
      this.lock = fs.openSync(this.lockPath, 'wx+');
    } catch(e) {
      if(e.code === 'EEXIST') {
        const err = new Error(`Unable to create ${this.lockPath}: File exists.`);
        err.code = 'LockDenied';
        throw err;
      } else if(e.code === 'ENOENT') {
        const err = new Error(e.message);
        err.code = 'MissingParent';
        throw err;
      } else if(e.code === 'EACCESS') {
        const err = new Error(e.message);
        err.code = 'NoPermission';
        throw err;
      }
      throw e;
    }
  }

  read(size) {
    this.raiseOnStaleLock();
    const data = Buffer.alloc(size);
    fs.readSync(this.lock, data, 0, size);
    if(data.length !== size) {
      throw 'Unexpected end-of-file while reading index';
    }
    return data;
  }

  write(buffer) {
    this.raiseOnStaleLock();
    //console.log('lock file writing', buffer);
    fs.writeSync(this.lock, buffer);
  }

  commit() {
    this.raiseOnStaleLock();
    //console.log('lockfile commiting...');
    fs.closeSync(this.lock);
    //console.log(this.lockPath, this.filePath);
    //console.log(fs.readFileSync(this.lockPath));
    fs.renameSync(this.lockPath, this.filePath);
    //console.log(fs.readFileSync(this.filePath, 'utf-8'));
    this.lock = null;
    //console.log('commit lock', this.filePath);
  }

  raiseOnStaleLock() {
    if(this.lock === null) {
      throw `Not holding lock on file: ${this.lockPath}`;
    }
  }

};

