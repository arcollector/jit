const { spawn } = require('child_process');
const fs = require('fs');

class Pager {

  constructor(
    env = {},
    stdout = process.stdout,
    stderr = process.stderr
  ) {
    env = { ...Pager.PAGER_ENV, ...env };
    const cmd = env.GIT_PAGER || env.PAGER || Pager.PAGER_CMD;

    this.child = spawn(
      cmd,
      {
        env,
        stdio: [ 'pipe', stdout, stderr ]
      }
    );
    // TODO
    this.child.on('close', () => {
      console.log('process close');
    });
    this.child.on('exit', () => {
      console.log('process exit');
    });
    this.child.on('end', () => {
      console.log('process end');
    });
  }

  input(data) {
    //console.log(data);
    const code = this.child.stdin.write(data);
    //console.log(code);
  }

  close() {
    this.child.stdin.end();
  }

  // TODO
  wait() {

  }

};

Pager.PAGER_CMD = 'less';
Pager.PAGER_ENV = {
  LESS: 'FRX',
  LV: '-c',
};

module.exports = Pager;

