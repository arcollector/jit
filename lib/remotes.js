const path = require('path');

const Refs = require('./refs');

class Refspec {

  constructor(source, target, forced) {
    this.source = source;
    this.target = target;
    this.forced = forced;
  }

  toString() {
    const spec = this.forced ? '+' : '';
    return `${spec}${this.source}:${this.target}`;
  }

  matchRefs(refs) {
    if(!this.source.toString().include('*')) {
      return { target: [this.source, this.forced] };
    }

    const pattern = new RegExp(
      `^${this.source.replace('*', '(.*)')}$`
    );
    const mappings = {};

    refs.forEach((ref) => {
      const match = pattern.exec(ref);
      if(match !== null) {
        const dst = match[1] ? target.replace('*', match[1]) : target;
        mappings[dst] = [ ref, this.forced ];
      }
    });

    return mappings;
  }

}

Refspec.REFSPEC_FORMAT = /^(\+?)([^:]+):([^:]+)$/;

Refspec.parse = function(spec) {
  const match = Refspec.REFSPEC_FORMAT.exec(spec);
  if(match !== null) {
    return new Refspec(match[2], match[3], match[1] === '+');
  }
  return null;
}

Refspec.expand = function(specs, refs) {
  specs = specs.map((spec) => Refspec.parse(spec));
  return specs.reduce((acc, cur) => ({
    ...acc,
    ...cur.matchRefs(refs),
  }), {});
}

class Remote {

  constructor(config, name) {
    this.config = config;
    this.name = name;
    this.config.open();
  }

  fetchUrl() {
    return this.config.get(['remote', this.name, 'url']);
  }

  pushUrl() {
    return this.config.get(['remote', this.name, 'pushurl']) || this.fetchUrl();
  }

  fetchSpecs() {
    return this.config.getAll(['remote', this.name, 'fetch']);
  }

  uploader() {
    return this.config.get(['remote', this.name, 'uploadpack']);
  }
}

class Remotes {

  constructor(config) {
    this.config = config;
  }

  add(name, url, branches = []) {
    if(branches.length === 0) {
      branches.push('*');
    }
    this.config.openForUpdate();

    console.log('resultado de esto', 
      this.config.get(['remote', name, 'url'])
    );
    if(this.config.get(['remote', name, 'url'])) {
      this.config.save();
      const err = new Error(
        `remote ${name} already exists.`
      );
      err.code = 'InvalidRemote';
      throw err;
    }

    this.config.set(['remote', name, 'url'], url);

    branches.forEach((branch) => {
      const source = path.join(Refs.HEADS_DIR, branch);
      const target = path.join(Refs.REMOTES_DIR, name, branch);
      const refspec = new Refspec(source, target, true);
      this.config.add(['remote', name, 'fetch'], refspec.toString());
    });

    this.config.save();
  }

  remove(name) {
    this.config.openForUpdate();

    if(!this.config.removeSection(['remote', name])) {
      this.config.save();
      const err = new Error(
        `No such remote: ${name}`
      );
      err.code = 'InvalidRemote';
      throw err;
    } else {
      this.config.save();
    }
  }

  listRemotes() {
    this.config.open();
    return this.config.subsections('remote');
  }

  get(name) {
    this.config.open();
    if(!this.config.section(['remote', name])) {
      return null;
    }

    return new Remote(this.config, name);
  }
}

Remotes.DEFAULT_REMOTE = 'origin';

module.exports = Remotes;

