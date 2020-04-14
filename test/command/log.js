const sinon = require('sinon');
const assert = require('assert');

const CommandHelper = require('../../test_helpers/command.helper');

describe('Command::Log', function() {

  const commandHelper = new CommandHelper();
  let clock;

  beforeEach(function() {
    clock = sinon.useFakeTimers({
        now: new Date(2019, 1, 1, 15, 30),
        shouldAdvanceTime: true,
        advanceTimeDelta: 20
    });

    commandHelper.beforeEach();
    commandHelper.writeFile('1.txt', 'one');
    commandHelper.jitCmd('add', '.');
    commandHelper.commit('commit message 1');
    commandHelper.writeFile('1.txt', 'two');
    commandHelper.jitCmd('add', '.');
    commandHelper.commit('commit message 2');
  });

  afterEach(function() {
    clock.restore();

    commandHelper.afterEach();
  });

  it('git log with out arguments', function() {
    commandHelper.jitCmd('log');
    commandHelper.assertStdout([
'commit 81ca63543d5e34100f6f7e3be5f86ad1beb52385',
'Author A. U. Thor <author@example.com>',
'Date: Fri Feb 01 15:30:00 2019 -0300',
'',
'	commit message 2',
'',
'commit e254bb1395892786c9da291b72d76b76b7002c7e',
'Author A. U. Thor <author@example.com>',
'Date: Fri Feb 01 15:30:00 2019 -0300',
'',
'	commit message 1',
    ].join('\n') + '\n');
  });

  it('git log with --abbrev-commit flag', function() {
    commandHelper.jitCmd('log', '--abbrev-commit');
    commandHelper.assertStdout([
'commit 81ca635',
'Author A. U. Thor <author@example.com>',
'Date: Fri Feb 01 15:30:00 2019 -0300',
'',
'	commit message 2',
'',
'commit e254bb1',
'Author A. U. Thor <author@example.com>',
'Date: Fri Feb 01 15:30:00 2019 -0300',
'',
'	commit message 1',
    ].join('\n') + '\n');
  });

  it('git log with --oneline flag', function() {
    commandHelper.jitCmd('log', '--oneline');
    commandHelper.assertStdout([
'81ca635 commit message 2',
'e254bb1 commit message 1',
    ].join('\n') + '\n');
  });

  it('git log with --decorate and --oneline flags', function() {
    commandHelper.jitCmd('log', '--decorate', '--oneline');
    commandHelper.assertStdout([
'81ca635 (HEAD -> master) commit message 2',
'e254bb1 commit message 1',
    ].join('\n') + '\n');
  });

  it('git log with --decorate and --oneline and --patch flags', function() {
    commandHelper.jitCmd('log', '--decorate', '--oneline', '--patch');
    commandHelper.assertStdout([
'81ca635 (HEAD -> master) commit message 2',
'diff --git a/1.txt b/1.txt',
'index 43dd47e..64c5e58 100644',
'--- a/1.txt',
'+++ b/1.txt',
'@@ -1,1 +1,1 @@',
'-one',
'+two',
'e254bb1 commit message 1',
'diff --git a/1.txt b/1.txt',
'new file mode 100644',
'index 0000000..43dd47e',
'--- /dev/null',
'+++ b/1.txt',
'@@ -0,0 +1,1 @@',
'+one',
    ].join('\n') + '\n');
  });

  it('start loggin from @^', function() {
    commandHelper.jitCmd('log', '--oneline', '@^');
    commandHelper.assertStdout([
'e254bb1 commit message 1',
    ].join('\n') + '\n');
  });

});
