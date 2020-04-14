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

    it('prints nothing if a file is touched', function() {
      commandHelper.touch('1.txt');
      assertStatus('');
    });

    it('reports deleted files', function() {
      commandHelper.delete('a/2.txt');
      assertStatus([
' D a/2.txt',
      ].join('\n') + '\n');
    });

    it('reports files in a deleted directories', function() {
      commandHelper.deleteFolder('a');
      assertStatus([
' D a/2.txt',
' D a/b/3.txt',
      ].join('\n') + '\n');
    });

    after(function() {
      commandHelper.afterEach();
    });

  });

});
