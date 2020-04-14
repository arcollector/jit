const Base = require('./base');

const { validKey } = require('../config');

class Config extends Base {

  setOptions(options) {
    Object.entries(options)
      .forEach(([key, value]) => {
        if(key === 'local') {
          this.options.file = 'local';
        } else if(key === 'global') {
          this.options.file = 'global';
        } else if(key === 'system') {
          this.options.file = 'system';
        } else if(key === 'file') {
          this.options.file = value;

        } else if(key === 'add') {
          this.options.add = value;

        } else if(key === 'replace-all') {
          this.options.replace = value;

        } else if(key === 'get-all') {
          this.options.getAll = value;

        } else if(key === 'unset') {
          this.options.unset = value;

        } else if(key === 'unset-all') {
          this.options.unsetAll = value;

        } else if(key === 'remove-section') {
          this.options.removeSection = value;
        } 
      });
  }

  run() {
    try {
      if(this.options.add) {
        this.addVariable();
      }
      if(this.options.replace) {
        this.replaceVariable();
      }
      if(this.options.getAll) {
        this.getAllValues();
      }
      if(this.options.unset) {
        this.unsetSingle();
      }
      if(this.options.unsetAll) {
        this.unsetAll();
      }
      if(this.options.removeSection) {
        this.removeSection();
      }
      const key = this.parseKey(this.args[0]);
      const value = this.args[1];
      if(value) {
        this.editConfig((config) =>
          config.set(key, value)
        );
      } else {
        this.readConfig((config) => {
          const val = config.get(key);
          return Array.isArray(val) ?
            [...val] :
              val ?
            [val] :
            [];
        })
      }
    } catch(e) {
      if(e.code === 'ParseError') {
        this.stderr.write(`error: ${e.message}`);
        this.exit(3);
      } else {
        throw e;
      }
    }
  }

  addVariable() {
    const key = this.parseKey(this.options.add);
    this.editConfig((config) =>
      config.add(key, this.args[0])
    );
  }

  replaceVariable() {
    const key = this.parseKey(this.options.replace);
    this.editConfig((config) =>
      config.replaceAll(key, this.args[0])
    );
  }

  unsetSingle() {
    const key = this.parseKey(this.options.unset);
    this.editConfig((config) =>
      config.unset(key)
    );
  }

  unsetAll() {
    const key = this.parseKey(this.options.unsetAll);
    this.editConfig((config) =>
      config.unsetAll(key)
    );
  }

  removeSection() {
    const [ key, ...rest ] = this.options.removeSection.split('.');
    this.editConfig((config) =>
      config.removeSection([key, ...rest])
    );
  }

  getAllValues() {
    const key = this.parseKey(this.options.getAll);
    return this.readConfig((config) =>
      config.getAll(key)
    );
  }

  readConfig(cb) {
    let config = this.repo.config();
    if(this.options.file) {
      config = config.file(this.options.file);
    }
    config.open();
    const values = cb(config);
    if(values.length === 0) {
      this.exit(1);
    } else {
      values.forEach((value) =>
        this.puts(value)
      );
      this.exit(0);
    }
  }

  editConfig(cb) {
    try {
      const config = this.repo.config().file(
        this.options.file || 'local'
      );
      config.openForUpdate();
      cb(config);
      config.save();
      this.exit(0);
    } catch(e) {
      if(e.code === 'Conflict') {
        this.stderr.write(`error: ${e.message}\n`);
        this.exit(5);
      } else {
        throw e;
      }
    }
  }

  parseKey(name) {
    console.log('parseKey', name);
    const [ section, ...rest ] = name.split('.');
    const subsection = rest.slice(0, rest.length-1);
    const variable = rest[rest.length-1];
    console.log('parseKey', section, subsection, variable);
    if(!variable) {
      this.stderr.write(`error: key does not contain a section: ${name}`);
      this.exit(2);
    }
    if(!validKey([section, variable])) {
      this.stderr.write(`error: invalid key: ${name}`);
      this.exit(1);
    }
    if(subsection.length === 0) {
      return [section, variable];
    } else {
      return [section, subsection.join('.'), variable];
    }
  }

}

module.exports = Config;
