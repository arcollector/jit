const sinon = require('sinon');
const assert = require('assert');

const CommandHelper = require('../../test_helpers/command.helper');

describe('Command::Commit', function() {

  const commandHelper = new CommandHelper();

  beforeEach(function() {
    clock = sinon.useFakeTimers({
        now: new Date(2019, 1, 1, 0, 0),
        shouldAdvanceTime: true,
        advanceTimeDelta: 20
    });

    commandHelper.beforeEach();
    commandHelper.writeFile('hello.txt', 'hello');
    commandHelper.jitCmd('add', 'hello.txt');
    commandHelper.writeFile('world.txt', 'world');
    commandHelper.jitCmd('add', 'world.txt');
    commandHelper.jitCmd('commit', '--message', 'initial commit');
    commandHelper.writeFile('a-dir/nested.txt', 'content');
    commandHelper.jitCmd('add', 'a-dir');
    commandHelper.jitCmd('commit', '--message', 'second commit');
  });

  afterEach(function() {
    clock.restore();

    commandHelper.afterEach();
  });

  it('should commit using --amend flag', function() {
    commandHelper.writeFile('a/b/c/file.txt', 'content');
    commandHelper.jitCmd('add', 'a');
    commandHelper.jitCmd('commit', '--amend');
  }); 

  it('should commit using --reuse-message flag', function() {
    commandHelper.jitCmd('reset', '--soft', '@^');
    commandHelper.writeFile('a/b/c/file.txt', 'content');
    commandHelper.jitCmd('add', 'a');
    commandHelper.jitCmd('commit', '--reuse-message', 'ORIG_HEAD');
  });

});
