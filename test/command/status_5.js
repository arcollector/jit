const assert = require('assert');
const fs = require('fs');

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

    it('reports deleted files', function() {
      commandHelper.delete('1.txt');
      commandHelper.delete('.git/index');
      commandHelper.jitCmd('add', '.');
      assertStatus([
'D  1.txt'
      ].join('\n') + '\n');
    });

    it('reports all deleted files inside directories', function() {
      commandHelper.deleteFolder('a');
      commandHelper.delete('.git/index');
      commandHelper.jitCmd('add', '.');
      assertStatus([
'D  a/2.txt',
'D  a/b/3.txt',
      ].join('\n') + '\n');
    });

    after(function() {
      commandHelper.afterEach();
    });

  });

});
