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
  });

  afterEach(function() {
    clock.restore();

    commandHelper.afterEach();
  }); 

  it('should commit', function() {
    commandHelper.jitCmd('rm', 'hello.txt');
    commandHelper.writeFile('hello.txt', 'hello');
    commandHelper.jitCmd('add', 'hello.txt');
    commandHelper.writeFile('world.txt', 'world');
    commandHelper.jitCmd('add', 'world.txt');
    commandHelper.commit('initial commit');
    commandHelper.assertStdout([
      '[master (root-commit) 8d7ce3c] initial commit',
      '',
    ].join('\n'));
    commandHelper.writeFile('a-dir/nested.txt', 'content');
    commandHelper.jitCmd('add', 'a-dir');
    commandHelper.commit('second commit');
    commandHelper.assertStdout([
      '[master 12bc4af] second commit',
      '',
    ].join('\n'));
    commandHelper.writeFile('a/b/c/file.txt', 'content');
    commandHelper.jitCmd('add', 'a');
    commandHelper.jitCmd('commit', '--message', 'third commit');
    commandHelper.assertStdout([
      '[master d4a2989] third commit',
      '',
    ].join('\n'));
    commandHelper.writeFile('test.txt', 'this is a test');
    commandHelper.jitCmd('add', '.');
    commandHelper.writeFile('commit_message.txt', 'fourth commit');
    commandHelper.jitCmd('commit', '--file', `${commandHelper.repoPath()}/commit_message.txt`);
    commandHelper.assertStdout([
      '[master b7f4f61] fourth commit',
      '',
    ].join('\n'));
  });

});
