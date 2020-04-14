const sinon = require('sinon');
const assert = require('assert');

const CommandHelper = require('../../test_helpers/command.helper');

describe('Command::Remote', function() {

  const commandHelper = new CommandHelper();

  describe('adding a remote', function() {
    beforeEach(function() {
      commandHelper.beforeEach();
      commandHelper.jitCmd('remote', 'add', 'origin', 'ssh://example.com/repo');
    })

    it.skip('fails to add an existing remote', function() {
      commandHelper.jitCmd( 'remote', 'add', 'origin', 'url');
      commandHelper.assertStatus( 128);
      commandHelper.assertStderr( 'fatal: remote origin already exists.\n');
    })

    it.skip('lists the remote', function() {
      commandHelper.jitCmd( 'remote');

      commandHelper.assertStdout([
        'origin',
        '',
      ].join('\n'));
    })

    it.skip('lists the remote with its URLs', function() {
      commandHelper.jitCmd( 'remote', '--verbose');

      commandHelper.assertStdout([
        'origin\tssh://example.com/repo (fetch)',
        'origin\tssh://example.com/repo (push)',
        '',
      ].join('\n'));
    })

    it.skip('sets a catch-all fetch refspec', function() {

      commandHelper.jitCmd( 'config', '--local', '--get-all', 'remote.origin.fetch');

      commandHelper.assertStdout([
        '+refs/heads/*:refs/remotes/origin/*',
        '',
      ].join('\n'));
    })

    afterEach(function() {
      commandHelper.afterEach();
    });

  })

  describe('adding a remote with tracking branches', function() {
    beforeEach(function() {
      commandHelper.beforeEach();
      commandHelper.jitCmd(
        ...'remote add origin ssh://example.com/repo -t master -t topic'.split(' ')
      );
    })

    it.skip('sets a fetch refspec for each branch', function() {
      commandHelper.jitCmd( 'config', '--local', '--get-all', 'remote.origin.fetch');

      commandHelper.assertStdout([
        '+refs/heads/master:refs/remotes/origin/master',
        '+refs/heads/topic:refs/remotes/origin/topic',
        ''
      ].join('\n'));
    })

    afterEach(function() {
      commandHelper.afterEach();
    });
  })

  describe('removing a remote', function() {
    beforeEach(function() {
      commandHelper.beforeEach();
      commandHelper.jitCmd(
        ...'remote add origin ssh://example.com/repo'.split(' ')
      );
    });

    it.skip('removes the remote', function() {
      commandHelper.jitCmd( 'remote', 'remove', 'origin');
      commandHelper.assertStatus( 0);

      commandHelper.jitCmd( 'remote');
      commandHelper.assertStdout( '');
    })

    it('fails to remove a missing remote', function() {
      commandHelper.jitCmd( 'remote', 'remove', 'no-such');
      commandHelper.assertStatus( 128);
      commandHelper.assertStderr( 'fatal: No such remote: no-such\n');
    })

    afterEach(function() {
      commandHelper.afterEach();
    });
  })
})

