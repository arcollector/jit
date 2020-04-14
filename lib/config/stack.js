const path = require('path');

const Config = require('../config');

class Stack {

  constructor(gitPath) {
    this.configs = {
      local: new Config(path.join(gitPath, 'config')),
      global: new Config(Stack.GLOBAL_CONFIG),
      system: new Config(Stack.SYSTEM_CONFIG),
    };
  }

  open() {
    Object.values(this.configs).forEach((config) =>
      config.open()
    );
  }

  get(key) {
    const vars = this.getAll(key);
    return vars[vars.length-1];
  }

  getAll(key) {
    return [].concat(
      ...['system', 'global', 'local'].map((name) => {
          this.configs[name].open();
          return this.configs[name].getAll(key);
        })
    );
  }

  file(name) {
    if(Object.keys(this.configs).includes(name)) {
      return this.configs[name];
    } else {
      return new Config(name);
    }
  }

}

Stack.GLOBAL_CONFIG = path.resolve('~/.gitconfig');
Stack.SYSTEM_CONFIG = 'etc/gitconfig';

module.exports = Stack;

