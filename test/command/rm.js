const sinon = require('sinon');
const assert = require('assert');

const CommandHelper = require('../../test_helpers/command.helper');

describe('Command::Rm', function() {

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
    commandHelper.writeFile('a-dir/nested.txt', 'content');
    commandHelper.jitCmd('add', 'a-dir');
    commandHelper.writeFile('a/b/c/file.txt', 'content');
    commandHelper.jitCmd('add', 'a');
    commandHelper.commit('initial commit');
  });

  afterEach(function() {
    clock.restore();

    commandHelper.afterEach();
  }); 

  it('should remove a file that can be recovered', function() {
    commandHelper.jitCmd('rm', 'hello.txt');
    commandHelper.assertStdout([
      'rm \'hello.txt\'',
      '',
    ].join('\n'));
  });

  it('should not remove a dir without -r flag', function() {
    commandHelper.jitCmd('rm', 'a');
    commandHelper.assertStderr([
      'not removing \'a\' recursively without -r',
      '',
    ].join('\n'));
    commandHelper.jitCmd('rm', 'a', '-r');
    commandHelper.assertStdout([
      'rm \'a/b/c/file.txt\'',
      '',
    ].join('\n'));
  });

  it('should not remove a file that is not tracked', function() {
    commandHelper.writeFile('hello_world.txt', 'hello world');
    commandHelper.jitCmd('rm', 'hello_world.txt');
    commandHelper.assertStderr([
      'pathspec \'hello_world.txt\' did not match any files',
      '',
    ].join('\n'));
  });

  it('should not remove a file that is in the index', function() {
    commandHelper.writeFile('hello.txt', 'hola');
    commandHelper.jitCmd('add', 'hello.txt');
    commandHelper.jitCmd('rm', 'hello.txt');
    commandHelper.assertStderr([
      'error: the following file has changes staged in the index:',
      '\thello.txt',
      '',
    ].join('\n'));
    commandHelper.jitCmd('rm', 'hello.txt', '--cached');
    commandHelper.assertStdout([
      'rm \'hello.txt\'',
      '',
    ].join('\n'));
  });

  it('should not remove a file that has changes in the index and in the workspace', function() {
    commandHelper.writeFile('hello.txt', 'hola');
    commandHelper.jitCmd('add', 'hello.txt');
    commandHelper.writeFile('hello.txt', 'ohaiyo');
    commandHelper.jitCmd('rm', 'hello.txt');
    commandHelper.assertStderr([
      'error: the following file has staged content different from both the file and the HEAD:',
      '\thello.txt',
      '',
    ].join('\n'));
    commandHelper.jitCmd('rm', 'hello.txt', '--force');
    commandHelper.assertStdout([
      'rm \'hello.txt\'',
      '',
    ].join('\n'));
  });

});
