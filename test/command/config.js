const assert = require('assert');

const CommandHelper = require('../../test_helpers/command.helper');

describe('Command::Config', function() {
  
  const commandHelper = new CommandHelper();

  beforeEach(function() {
    commandHelper.beforeEach();
  });

  it.skip('returns 1 for unknown variables', function() {
    commandHelper.jitCmd('config', '--local', 'no.such');
    commandHelper.assertStatus(1);
  });

  it.skip('returns 1 when the key is invalid', function() {
    commandHelper.jitCmd('config', '--local', '0.0');
    commandHelper.assertStatus(1);
    commandHelper.assertStderr('error: invalid key: 0.0\n');
  });

  it.skip('returns 2 when no section is given', function() {
    commandHelper.jitCmd('config', '--local', 'no')
    commandHelper.assertStatus(2)
    commandHelper.assertStderr('error: key does not contain a section: no\n');
  });

  it.skip('returns the value of a set variable', function() {
    commandHelper.jitCmd('config', 'core.editor', 'ed');
    commandHelper.jitCmd('config', '--local', 'Core.Editor');
    commandHelper.assertStatus(0);
    commandHelper.assertStdout('ed\n');
  });

  it.skip('returns the value of a set variable in a subsection', function() {
    commandHelper.jitCmd('config', 'remote.origin.url', 'git@github.com:jcoglan.jit');

    commandHelper.jitCmd('config', '--local', 'Remote.origin.URL');
    commandHelper.assertStatus(0);
    commandHelper.assertStdout('git@github.com:jcoglan.jit\n');
  });

  it.skip('unsets a variable', function() {
    commandHelper.jitCmd('config', 'core.editor', 'ed');
    console.log('\tvoy a unsetear');
    commandHelper.jitCmd('config', '--unset', 'core.editor');

    commandHelper.jitCmd('config', '--local', 'Core.Editor');
    commandHelper.assertStatus(1);
  });

  describe('with multi-valued variables', function() {
 
    beforeEach(function() {
      commandHelper.beforeEach();
      commandHelper.jitCmd('config', '--add', 'remote.origin.fetch', 'master');
      commandHelper.jitCmd('config', '--add', 'remote.origin.fetch', 'topic');
    });

    it.skip('returns the last value', function() {
      commandHelper.jitCmd('config', 'remote.origin.fetch');
      commandHelper.assertStatus(0);
      commandHelper.assertStdout('topic\n');
    }); 

    it.skip('returns all the values', function() {
      commandHelper.jitCmd('config', '--get-all', 'remote.origin.fetch');
      commandHelper.assertStatus(0);

      commandHelper.assertStdout([
        'master',
        'topic',
        '',
      ].join('\n'));
    });

    it.skip('returns 5 on trying to set a variable', function() {
      commandHelper.jitCmd('config', 'remote.origin.fetch', 'new-value');
      commandHelper.assertStatus(5);

      commandHelper.jitCmd('config', '--get-all', 'remote.origin.fetch');
      commandHelper.assertStatus(0);

      commandHelper.assertStdout([
        'master',
        'topic',
        '',
      ].join('\n'));
    });

    it.skip('replaces a variable', function() {
      commandHelper.jitCmd('config', '--replace-all', 'remote.origin.fetch', 'new-value');

      commandHelper.jitCmd('config', '--get-all', 'remote.origin.fetch');
      commandHelper.assertStatus(0);
      commandHelper.assertStdout('new-value\n');
    });

    it.skip('returns 5 on trying to unset a variable', function() {
      commandHelper.jitCmd('config', '--unset', 'remote.origin.fetch');
      commandHelper.assertStatus(5);

      commandHelper.jitCmd('config', '--get-all', 'remote.origin.fetch');
      commandHelper.assertStatus(0);

      commandHelper.assertStdout([
        'master',
        'topic',
        '',
      ].join('\n'));
    });

    it.skip('unsets a variable', function() {
      commandHelper.jitCmd('config', '--unset-all', 'remote.origin.fetch');

      commandHelper.jitCmd('config', '--get-all', 'remote.origin.fetch');
      commandHelper.assertStatus(1);
    });

    afterEach(function() {
      commandHelper.afterEach();
    });
  });

  it.skip('removes a section', function() {
    commandHelper.jitCmd('config', 'core.editor', 'ed');
    commandHelper.jitCmd('config', 'remote.origin.url', 'ssh://example.com/repo');
    commandHelper.jitCmd('config', '--remove-section', 'core');

    commandHelper.jitCmd('config', '--local', 'remote.origin.url');
    commandHelper.assertStatus(0);
    commandHelper.assertStdout('ssh://example.com/repo\n');

    commandHelper.jitCmd('config', '--local', 'core.editora');
    commandHelper.assertStatus(1);
  });

  it('removes a subsection', function() {
    commandHelper.jitCmd('config', 'core.editor', 'ed');
    commandHelper.jitCmd('config', 'remote.origin.url', 'ssh://example.com/repo');
    commandHelper.jitCmd('config', '--remove-section', 'remote.origin');

    commandHelper.jitCmd('config', '--local', 'core.editor');
    commandHelper.assertStatus(0);
    commandHelper.assertStdout('ed\n');

    commandHelper.jitCmd('config', '--local', 'remote.origin.url');
    commandHelper.assertStatus(1);
  });

  afterEach(function() {
    commandHelper.afterEach();
  });

});

