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

    it('reports a file added to a tracked directory', function() {
      commandHelper.writeFile('a/4.txt', 'four');
      commandHelper.jitCmd('add', '.');
      assertStatus([
'A  a/4.txt',
      ].join('\n') + '\n');
    });

    it('reports a file added to an untracked directory', function() {
      commandHelper.writeFile('d/e/5.txt', 'five');
      commandHelper.jitCmd('add', '.');
      assertStatus([
'A  d/e/5.txt',
      ].join('\n') + '\n');
    });

    it('reports modified modes', function() {
      commandHelper.makeExecutable('1.txt');
      commandHelper.jitCmd('add', '.');
      assertStatus([
'M  1.txt',
      ].join('\n') + '\n');
    });

    it('reports modified contents', function() {
      commandHelper.writeFile('a/b/3.txt', 'changed');
      commandHelper.jitCmd('add', '.');
      assertStatus([
'M  a/b/3.txt',
      ].join('\n') + '\n');
    });

    after(function() {
      commandHelper.afterEach();
    });

  });

});
