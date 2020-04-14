const sinon = require('sinon');
const assert = require('assert');

const CommandHelper = require('../../test_helpers/command.helper');

describe('Command::Checkout', function() {

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
    commandHelper.commit('commit message 1');
    commandHelper.writeFile('1.txt', 'two');
    commandHelper.jitCmd('add', '.');
    commandHelper.commit('commit message 2');
  });

  afterEach(function() {
    clock.restore();

    commandHelper.afterEach();
  });

  it('branch @~1 and checkout modifies 1.txt file', function() {
    commandHelper.jitCmd('branch', 'first', '@~1');
    commandHelper.jitCmd('checkout', 'first');
    commandHelper.assertStderr([
'Switched to branch first'
    ].join('\n') + '\n');
   
  });

  it('branch @~1 and checkout but 1.txt has been modified', function() {
    commandHelper.jitCmd('branch', 'previous', '@~1');
    commandHelper.writeFile('1.txt', 'edited');
    commandHelper.jitCmd('checkout', 'previous');
    commandHelper.assertStderr([
'error: Your local changes to the following files would be overwritten by checkout:',
'\t1.txt',
'Please commit your changes or stash them before you switch branches.',
'Aborting',
    ].join('\n') + '\n');
  });

  it('branch @~1 and checkout but 1.txt has been deleted', function() {
    commandHelper.jitCmd('branch', 'previous', '@~1');
    commandHelper.delete('1.txt');
    commandHelper.jitCmd('checkout', 'previous');
    assert.deepEqual(
      commandHelper.catFile('1.txt'),
      'one'
    );
    commandHelper.assertStderr([
'Switched to branch previous'
    ].join('\n') + '\n');
  });

});
