const assert = require('assert');

const CommandHelper = require('../../test_helpers/command.helper');

describe('Command::Status', function() {

  const commandHelper = new CommandHelper();

  beforeEach(function() {
    commandHelper.beforeEach();
  });

  afterEach(function() {
    commandHelper.afterEach();
  }); 

  function assertStatus(output) {
    commandHelper.jitCmd('status', '--porcelain');
    commandHelper.assertStdout(output);
  }

  it('lists untracked files in name order', function() {
    commandHelper.writeFile('file.txt', '');
    commandHelper.writeFile('another.txt', '');
    assertStatus(`
?? another.txt
?? file.txt
    `.trim() + '\n');
  });

  it('lists files as untracked if they are not in the index', function() {
    commandHelper.writeFile('commited.txt', '');
    commandHelper.jitCmd('add', '.');
    commandHelper.commit('commit message');
    commandHelper.writeFile('file.txt', '');
    assertStatus(`
?? file.txt
    `.trim() + '\n');
  });

  it('lists untracked directories, not their contents', function() {
    commandHelper.writeFile('file.txt', '');
    commandHelper.writeFile('dir/another.txt', '');
    assertStatus(`
?? dir/
?? file.txt
    `.trim() + '\n');
  });

  it('lists untracked files inside tracked directories', function() {
    commandHelper.writeFile('a/b/inner.txt', '');
    commandHelper.jitCmd('add', '.');
    commandHelper.commit('commit message');
    commandHelper.writeFile('a/outer.txt', '');
    commandHelper.writeFile('a/b/c/file.txt', '');
    assertStatus(`
?? a/b/c/
?? a/outer.txt
    `.trim() + '\n');
  });

  it('does not list empty untracked directories', function() {
    commandHelper.mkdir('outer');
    assertStatus('')
  });

  it('lists untracked directories that indirectly contain files', function() {
    commandHelper.writeFile('outer/inner/file.txt', '');
    assertStatus(`
?? outer/
    `.trim() + '\n');
  });

});

