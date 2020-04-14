const assert = require('assert');

const CommandHelper = require('../../test_helpers/command.helper');

describe('Command::Status', function() {

  const commandHelper = new CommandHelper();

  function assertStatus(output) {
    commandHelper.jitCmd('status', '--porcelain');
    commandHelper.assertStdout(output);
  }

  describe('index/workspace changes', function() {
    beforeEach(function() {
      commandHelper.beforeEach();
      commandHelper.writeFile('1.txt', 'one');
      commandHelper.writeFile('a/2.txt', 'two');
      commandHelper.writeFile('a/b/3.txt', 'three');
      commandHelper.jitCmd('add', '.');
      commandHelper.commit('commit message');
    });

    afterEach(function() {
      commandHelper.afterEach();
    });

    it('prints nothing when no files are changed', function() {
      assertStatus('');
    });

    it('reports files with modified contents', function() {
      commandHelper.writeFile('1.txt', 'changed');
      commandHelper.writeFile('a/2.txt', 'modified');
      assertStatus([
' M 1.txt',
' M a/2.txt',
      ].join('\n') + '\n');
    });

    it('reports files with changed modes', function() {
      commandHelper.makeExecutable('a/2.txt');
      assertStatus([
' M a/2.txt',
      ].join('\n') + '\n');
    });

    it('reports modified files with unchanged size', function() {
      commandHelper.writeFile('a/b/3.txt', 'hello');
      assertStatus([
' M a/b/3.txt',
      ].join('\n') + '\n');
    });

    after(function() {
      commandHelper.afterEach();
    });

  });

});
