const fs = require('fs');
const path = require('path');

module.exports = class Workspace {

  constructor(pathname) {
    this.IGNORE = [ '.', '..', '.git' ];
    this.pathname = pathname;
  }

  listFiles(pathname = this.pathname) {
    //console.log('pathname recibido is', pathname);
    try {
      const stat = fs.statSync(pathname, { bigint: false });
      if(stat.isDirectory()) {
        //console.log('\tes un directorio');
        const files = fs.readdirSync(pathname);
        //console.log('archivos dentro son', files);
        const filesFiltered = files.filter((file) =>
          !this.IGNORE.includes(file)
        );
        //console.log('archivos filtradors', filesFiltered);
        const allFiles = filesFiltered.map((file) => {
          const filePath = `${pathname}/${file}`;
          return this.listFiles(filePath);
        });
        //console.log(allFiles);
        const flattenedAllFiles = [].concat(...allFiles);
        //console.log(flattenedAllFiles);
        return flattenedAllFiles;
      } else {
        // use this.pathname (the original call) to construct a valid
        // recursive list of files starting in this.pathname
        const relativePath = path.relative(this.pathname, pathname);
        //console.log('relative path from', this.pathname, 'to', filePath, 'is', relativePath);
        return [ relativePath ];
      }

    } catch(e) {
      if(e.code === 'ENOENT') {
        const err = new Error(`pathspec(${pathname}): did not match any files`);
        err.code = 'MissingFile';
        throw err;
      }
      if(e.code === 'EACCES') {
        const err = new Error(`pathspec(${pathname}): Permission denied`);
        err.code = 'NoPermission';
        throw err;
      }
      throw e;
    }
  }

  readFile(file) {
    const pathname = `${this.pathname}/${file}`;
    try {
      return fs.readFileSync(pathname);
    } catch(e) {
      if(e.code === 'EACCES') {
        const err = new Error(`read(${pathname}): Permission denied`);
        err.code = 'NoPermission';
        throw err;
      }
      throw e;
    }
  }

  statFile(file) {
    const pathname = `${this.pathname}/${file}`;
    try {
      return fs.statSync(pathname, { bigint: false });
    } catch(e) {
      if(e.code === 'EACCES') {
        const err = new Error(`stat(${pathname}): Permission denied`);
        err.code = 'NoPermission';
        throw err;
      }
      if(e.code === 'ENOENT') {
        return null;
      }
      throw e;
    }
  }

  writeFile(pathname, data, mode = null, mkdir = false) {
    const fullPath = path.join(this.pathname, pathname);
    if(mkdir) {
      this.mkdirP(path.dirname(fullPath));
    }
    fs.writeFileSync(
      fullPath,
      data
    );
    if(mode !== null) {
      fs.chmodSync(fullPath, mode);
    }
  }

  listDir(dirname) {
    const pathname = path.join(this.pathname, dirname || '');
    //console.log('readdirSync', pathname);
    const files = fs.readdirSync(pathname);
    const entries = files.filter((file) =>
      !this.IGNORE.includes(file)
    );
    //console.log('entries are', entries);
    const stats = {};
    entries.forEach((name) => {
      const pathnameAndName = path.join(pathname, name);
      //console.log('pathnameAndName', pathnameAndName);
      const relativePath = path.relative(this.pathname, pathnameAndName);
      //console.log('relativePath', relativePath);
      stats[relativePath] = fs.statSync(pathnameAndName, { bigint: false });
    });
    return stats;
  }

  applyMigration(migration) {
    //console.log('workspace#applyMigration');
    //console.log(migration);
    this.applyChangeList(migration, 'delete');
    // there are Sets objects
    Array.from(migration.rmdirs)
      .sort()
      .reverse()
      .forEach((dir) =>
        this.removeDirectory(dir)
      );

    Array.from(migration.mkdirs)
      .sort()
      .forEach((dir) =>
        this.makeDirectory(dir)
      );

    this.applyChangeList(migration, 'update');
    this.applyChangeList(migration, 'create');
  }

  applyChangeList(migration, action) {
    migration.changes[action].forEach(([filename, entry]) => {
      const pathname = path.join(this.pathname, filename);
      this.rmRf(pathname);
      if(action === 'delete') {
        // next
      } else {
        // WRONLY | CREAT | EXCL
        const flags = 'wx';
        const data = migration.blobData(entry.oid);
        const fd = fs.openSync(pathname, flags);
        fs.writeSync(fd, data);
        fs.chmodSync(pathname, entry.mode());
        fs.closeSync(fd);
      }
    });
  }

  remove(pathname) {
    try {
      this.rmRf(pathname);
      this.ascend(path.dirname(pathname)).forEach((dirname) =>
        this.removeDirectory(dirname)
      );
    } catch(e) {
      if(e.code !== 'ENOENT') {
        throw e;
      }
    }
  }

  removeDirectory(dirname) {
    try {
      const pathname = path.join(this.pathname, dirname);
      fs.rmdirSync(pathname);
    } catch(e) {
      if(
        e.code === 'ENOENT' ||
        e.code === 'ENOTDIR' ||
        e.code === 'ENOTEMPTY'
      ) {
        // do nothing
      } else {
        throw e;
      } 
    }
  }

  makeDirectory(dirname) {
    const pathname = path.join(this.pathname, dirname);
    const stat = this.statFile(dirname);
    if(stat.isFile()) {
      fs.unlinkSync(pathname);
    }
    if(!stat.isDirectory()) {
      fs.mkdirSync(pathname);
    }
  }

  rmRf(path) {
    let files = [];
    if(fs.existsSync(path)) {
        if(fs.lstatSync(path).isDirectory()) {
          files = fs.readdirSync(path);
          files.forEach((file,index) => {
              var curPath = path + "/" + file;
              if(fs.lstatSync(curPath).isDirectory()) { // recurse
                  this.rmRf(curPath);
              } else { // delete file
                  fs.unlinkSync(curPath);
              }
          });
          fs.rmdirSync(path);
        } else {
          fs.unlinkSync(path);
        }
    } else {
      //console.log('does not exists', path);
    }
  }

  mkdirP(dirname) {
    fs.mkdirSync(dirname, { recursive: true });
  }

  descend(pathname) { 
    const pathArr = pathname.split(path.sep);
    const descends = [];
    for(let i = 0; i < pathArr.length; i++) {
      const descend = [];
      for(let j = 0; j <= i; j++) {
        descend.push(pathArr[j]);
      }
      descends.push(descend.join(path.sep));
    }
    return descends;
  }

  ascend(pathname) {
    const descends = this.descend(pathname);
    return descends.reverse();
  }
 
}

