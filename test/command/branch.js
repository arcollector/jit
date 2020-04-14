const sinon = require('sinon');
const assert = require('assert');

const CommandHelper = require('../../test_helpers/command.helper');

describe('Command::Branch', function() {

  const commandHelper = new CommandHelper();
  let clock;

  beforeEach(function() {
    clock = sinon.useFakeTimers({
        now: new Date(2019, 1, 1, 0, 0),
        shouldAdvanceTime: true,
        advanceTimeDelta: 20
    });

    commandHelper.beforeEach();
    commandHelper.writeFile('1.txt', 'one');
    commandHelper.jitCmd('add', '.');
    commandHelper.commit('commit message');
  });

  afterEach(function() {
    clock.restore();
    commandHelper.afterEach();
  });

  it('create master branch', function() {
    commandHelper.jitCmd('branch', 'master');
    const a = commandHelper.readHead();
    const b = commandHelper.readRefsHeads('master');
    assert(a, b);
  });

  it('create master branch from @', function() {
    commandHelper.jitCmd('branch', 'master', '@');
    const a = commandHelper.readHead();
    const b = commandHelper.readRefsHeads('master');
    assert(a, b);
  });

  it('create master branch from an oid', function() {
    const oid = commandHelper.readHead();
    commandHelper.jitCmd('branch', 'master', oid);
    const a = commandHelper.readHead();
    const b = commandHelper.readRefsHeads('master');
    assert(a, b);
  });

  it('create master branch from an inexisting oid', function() {
    const oid = '1234567';
    commandHelper.jitCmd('branch', 'master', oid);
    commandHelper.assertStderr(`
fatal: Not a valid object name: '${oid}'.
    `.trim() + '\n'); 
  });

  it('list branches', function() {
    commandHelper.writeFile('2.txt', 'two');
    commandHelper.jitCmd('add', '.');
    commandHelper.commit('commit message 2');
    commandHelper.jitCmd('branch', 'previous', '@~1')
    commandHelper.jitCmd('branch', 'current', '@');
    commandHelper.jitCmd('branch', '-D', 'master');
    commandHelper.jitCmd('branch');
    commandHelper.assertStdout([
'  current',
'  previous'
    ].join('\n') +  '\n');
  });

  it('list branches verbose', function() {
    commandHelper.writeFile('2.txt', 'two');
    commandHelper.jitCmd('add', '.');
    commandHelper.commit('commit message 2');
    commandHelper.jitCmd('branch', 'previous', '@~1')
    commandHelper.jitCmd('branch', 'current', '@');
    commandHelper.jitCmd('branch', '-D', 'master');
    commandHelper.jitCmd('branch', '--verbose');
    commandHelper.assertStdout([
'  current  e9eb07e commit message 2',
'  previous 4b610d2 commit message',
    ].join('\n') +  '\n');
  });

  it('delete a branch does not exist', function() {
    commandHelper.jitCmd('branch', '-D', 'mazter');
    commandHelper.assertStderr([
'error: branch \'mazter\' not found'
    ].join('\n') +  '\n');
  });

});
