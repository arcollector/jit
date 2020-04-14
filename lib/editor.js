const fs = require('fs');
const child_process = require('child_process');

class Editor {

  constructor(path, command) {
    this.path = path;
    this.command = command || Editor.DEFAULT_EDITOR;
    this.closed = false;
    this.file = fs.openSync(this.path, 'w+');
  }

  puts(string) {
    if(this.closed) {
      return;
    }
    fs.writeSync(this.file, `${string}\n`);
  }

  // WHY NOT CALLING THIS METHOD, COMMENTS
  // INTEAD OF NOTES!!! THIS IS NON SENSE
  note(string) {
    if(this.closed) {
      return;
    }
    string.split('\n').forEach((line) =>
      fs.writeSync(this.file, `# ${line}\n`)
    );
  }

  close() {
    this.closed = true;
  }

  editFile() {
    fs.closeSync(this.file);

    // this is used to know if we need to launch
    // the editor, it doest mean that the file descriptor is closed
    if(!this.closed) {
      const editorArgv = `${this.command} ${this.path}`;
      try {
        child_process.execSync(editorArgv, {stdio: 'inherit'});
      } catch(e) {
        throw `There was a problem with editor '${this.command}'`;
      }
    }
    
    return this.removeNotes(
      fs.readFileSync(this.path, 'utf-8')
    );
  }

  removeNotes(string) {
    /*
    console.log('-------');
    console.log(string);
    console.log('-------');
    */
    const lines = string.split('\n').filter((line) =>
      line.indexOf('#') !== 0
    );

    /*
    console.log('-------');
    console.log(lines);
    console.log('-------');
    */
    if(
      lines
        .filter((line) => /^\s*$/.test(line))
        .length === lines.length
    ) {
      return null;
    }

    return `${lines.join('\n').trim()}\n`;
  }

};

Editor.edit = function(path, command, cb) {
  const editor = new Editor(path, command);
  cb(editor);
  return editor.editFile();
};

Editor.DEFAULT_EDITOR = 'vi';

module.exports = Editor;

