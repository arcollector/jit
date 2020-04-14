const fs = require('fs');

const Lockfile = require('./lockfile');

class Variable {

  constructor(name, value) {
    this.name = name;
    this.value = value;
  }

}

Variable.normalize = function(name) {
  return name.toLowerCase();
}

Variable.serialize = function(name, value) {
  return `\t${name} = ${value}\n`;
}

class Section {

  constructor(name) {
    console.log('new Section', name);
    this.name = name;
  }

  headlingLine() {
    let line = `[${this.name[0]}`;
    if(this.name.length > 1) {
      line += ` "${this.name.slice(1, this.name.length).join('.')}"`;
    }
    line += ']\n';
    return line;
  }
}

Section.normalize = function(name) {
  if(name.length === 0) {
    return [];
  }
  return [
    name[0].toLowerCase(),
    name.slice(1, name.length).join('.')
  ];
}

class Line {

  constructor(text, section, variable) {
    this.text = text;
    this.section = section;
    this.variable = variable;
  }

  normalVariable() {
    return Variable.normalize(this.variable ? this.variable.name : '');
  }
}

class Config {

  constructor(path) {
    this.path = path;
    console.log('Config.constructor', path);
    this.lockfile = new Lockfile(path);
    this.lines = null;
    this.lineCount = 0;
  }

  open() {
    if(!this.lines) {
      this.readConfigLines();
    }
  }

  openForUpdate() {
    this.lockfile.holdForUpdate();
    this.readConfigLines();
  }

  readConfigLines() {
    this.lines = {};
    let section = new Section([]);
    //console.log('voy a leer archivo');
    //console.log(fs.readFileSync(this.path, 'utf-8'));
    try {
      fs.readFileSync(this.path, 'utf-8').split('\n').forEach((line) => {
        line = `${line}\n`;
        //console.log('before parseLine', section, line);
        line = this.parseLine(section, line);
        //console.log('readConfigLines', line);
        section = line.section;
        this.linesFor(section).push(line);
      });
    } catch(e) {
      if(e.code === 'ENOENT') {

      } else {
        throw e;
      }
    }
    console.log('archivo leido');
    console.log(this.lines);
  }

  linesFor(section) {
    const name = Section.normalize(section.name);
    if(!this.lines[name]) {
      this.lines[name] = [];
    }
    this.lineCount++;
    return this.lines[name];
  }

  parseLine(section, line) {
    let match = Config.SECTION_LINE.exec(line);
    if(match !== null) {
      const section = new Section(
        [match[1], match[3]].filter((str) => str)
      );
      return new Line(line, section);
    } else {
      match = Config.VARIABLE_LINE.exec(line);
      if(match !== null) {
        const variable = new Variable(
          match[1], this.parseValue(match[2])
        );
        return new Line(line, section, variable);
      } else {
        match = Config.BLANK_LINE.exec(line);
        if(match !== null) {
          return new Line(line, section, null);
        } else {
          console.log('before throw', line);
          const err = new Error(
            `bad config line ${this.lineCount + 1} in file ${this.path}`
          );
          err.code = 'ParseError';
          throw err;
        }
      }
    }
  }

  parseValue(value) {
    if(['yes', 'on', 'true'].includes(value)) {
      return true;
    } else if(['no', 'off', 'false'].includes(value)) {
      return false;
    } else if(Config.INTEGER.test(value)) {
      return parseInt(value, 10);
    } else {
      return value;
    }
  }

  save() {
    console.log('SAVE', this.lines);
    Object
      .entries(this.lines)
      .forEach(([section, lines]) => {
        lines.forEach((line) => {
          //console.log('save', line.text, line.text.length);
          this.lockfile.write(line.text);
        });
    });
    this.lockfile.commit();
    console.log('------');
    console.log(fs.readFileSync(this.lockfile.filePath, 'utf-8'));
  }

  splitKey(key) {
    // key is an array like: ['remote', 'origin', 'url']
    key = key.map((item) => item.toString());
    // so key becomes ['remote', 'origin']
    const variable = key.pop();
    // and variable is = 'url']
    // returing [['remote', 'origin'], 'url']
    return [key, variable];
  }

  findLines(key, variable) {
    const name = Section.normalize(key);
    console.log('findLines', key, variable, name);
    console.log('resultado de findLines');
    console.log(this.lines[name]);
    if(!this.lines[name]) {
      return [null, []];
    }

    let lines = this.lines[name];
    const section = lines[0].section;
    const normal = Variable.normalize(variable);

    lines = lines.filter((l) =>
      l.normalVariable() === normal
    );

    return [section, lines];
  }

  getAll(keyRaw) {
    const [ key, variable ] = this.splitKey(keyRaw);
    const [ _, lines ] = this.findLines(key, variable);
    console.log('getAll', keyRaw, lines);
    return lines.map((line) => line.variable.value);
  }

  get(key) {
    const all = this.getAll(key);
    console.log('get(', key, ')', all);
    return all.length !== 0 ? all[all.length-1] : null;
  }

  add(keyRaw, value) {
    const [ key, variable ] = this.splitKey(keyRaw);
    const [ section, _ ] = this.findLines(key, variable);
    this.addVariable(section, key, variable, value);
  }

  addVariable(section, key, variable, value) {
    section = section || this.addSection(key);

    const text = Variable.serialize(variable, value);
    variable = new Variable(variable, value);
    const line = new Line(text, section, variable);

    this.linesFor(section).push(line);
  }

  addSection(key) {
    const section = new Section(key);
    const line = new Line(section.headlingLine(), section);
    console.log('addSection', line);
    this.linesFor(section).push(line);
    return section;
  }
 
  set(keyRaw, value) {
    const [ key, variable ] = this.splitKey(keyRaw);
    const [ section, lines ] = this.findLines(key, variable);

    if(lines.length === 0) {
      this.addVariable(section, key, variable, value);
    } else if(lines.length === 1) {
      this.updateVariable(lines[0], variable, value);
    } else {
      const err = new Error(
        'cannot overwrite multiple values with a single value'
      );
      err.code = 'Conflict';
      throw err;
    }
  }

  updateVariable(line, variable, value) {
    line.variable.value = value;
    line.text = Variable.serialize(variable, value);
  } 

  replaceAll(keyRaw, value) {
    const [ key, variable ] = this.splitKey(keyRaw);
    const [ section, lines ] = this.findLines(key, variable);

    this.removeAll(section, lines);
    console.log('after replaceAll', this.lines);
    this.addVariable(section, key, variable, value);
  }

  removeAll(section, lines) {
    Object
      .values(lines)
      .forEach((line) => {
        const arr = this.linesFor(section);
        const i = arr.indexOf(line);
        if(i !== -1) {
          arr.splice(i, 1);
        }
      });
  }

  unsetAll(keyRaw, cb) {
    const [ key, variable ] = this.splitKey(keyRaw);
    let [ section, lines ] = this.findLines(key, variable);
    console.log('unsetAll', key, variable, section, lines);
    if(!section) {
      return;
    }
    if(cb) {
      cb(lines);
    }

    console.log(this.lines);
    this.removeAll(section, lines);
    console.log(this.lines);
    lines = this.linesFor(section);
    if(lines.length === 1) {
      this.removeSection(key);
    }
  }

  removeSection(key) {
    key = Section.normalize(key);
    console.log('removeSection', key);
    if(this.lines[key]) {
      delete this.lines[key];
      return true;
    } else {
      return false;
    }
  }

  unset(key) {
    this.unsetAll(key, (lines) => {
      if(lines.length > 1) {
        const err = new Error(
          `${key} has multiple values`
        );
        err.code = 'Conflict';
        throw err;
      }
    });
  }

  subsections(nameRaw) {
    const [ name, _ ] = Section.normalize([nameRaw]);
    const sections = Object.keys(this.lines);
    console.log('subsections', name, sections);
    return sections
      .filter((section) => section.split(',')[0] === name)
      .filter((section) => section.split(',')[1])
      .map((section) => section.split(',')[1])
  }

  section(keyRaw) {
    const key = Section.normalize(keyRaw);
    // key is an array [a,b] => 'a,b' to be to compare
    return Object.keys(this.lines).includes(key.toString());
  }

}

Config.validKey = function(key) {
  return Config.VALID_SECTION.test(key[0]) &&
    Config.VALID_VARIABLE.test(key[1]);
}

Config.SECTION_LINE = /^\s*\[([a-z0-9-]+)( "(.+)")?\]\s*($|#|;)/i;
Config.VARIABLE_LINE = /^\s*([a-z][a-z0-9-]*)\s*=\s*(.*?)\s*($|#|;)/i;
Config.BLANK_LINE = /^\s*($|#|;)/;
Config.INTEGER = /^-?[1-9][0-9]*$/;

Config.VALID_SECTION = /^[a-z0-9-]+$/i;
Config.VALID_VARIABLE = /^[a-z][a-z0-9-]*$/i;

module.exports = Config;

