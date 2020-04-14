const Init = require('./command/init');
const Add = require('./command/add');
const Rm = require('./command/rm');
const Commit = require('./command/commit');
const Status = require('./command/status');
const Diff = require('./command/diff');
const Branch = require('./command/branch');
const Checkout = require('./command/checkout');
const Log = require('./command/log');
const Merge = require('./command/merge');
const Reset = require('./command/reset');
const CherryPick = require('./command/cherry.pick');
const Revert = require('./command/revert');
const Config = require('./command/config');
const Remote = require('./command/remote');

class Command {};

Command.COMMANDS = {
  init: Init,
  add: Add,
  rm: Rm,
  commit: Commit,
  status: Status,
  diff: Diff,
  branch: Branch,
  checkout: Checkout,
  log: Log,
  merge: Merge,
  reset: Reset,
  'cherry-pick': CherryPick,
  revert: Revert,
  config: Config,
  remote: Remote,
};

Command.execute = function(
  dir,
  env,
  argv,
  stdin,
  stdout,
  stderr
) {
  argv.shift();
  const name = argv.shift();
  if(typeof Command.COMMANDS[name] === 'undefined') {
    const err = new Error(`${name} is not a jit command.`);
    err.code = 'Command::Unknown';
    throw err;
  }

  const commandClass = Command.COMMANDS[name];
  const command = new commandClass(
    dir,
    env,
    argv,
    stdin,
    stdout,
    stderr
  );
  command.execute();
  return command;
};

module.exports = Command;

