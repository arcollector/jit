const sinon = require('sinon');
const assert = require('assert');

const CommandHelper = require('../../test_helpers/command.helper');

describe('Command::Merge', function() {

  const commandHelper = new CommandHelper();
  let clock;

  beforeEach(function() {
    clock = sinon.useFakeTimers({
        now: new Date(2019, 1, 1, 0, 0),
        shouldAdvanceTime: true,
        advanceTimeDelta: 20
    });

    commandHelper.beforeEach();
    commandHelper.writeFile('f.txt', 'one');
    commandHelper.jitCmd('add', '.');
    commandHelper.commit('A');
    clock.tick(1000);

    commandHelper.writeFile('f.txt', 'two');
    commandHelper.jitCmd('add', '.');
    commandHelper.commit('B');
    clock.tick(1000);

    commandHelper.jitCmd('branch', 'topic', '@^');
    commandHelper.jitCmd('checkout', 'topic');
    commandHelper.writeFile('f.txt', 'three');
    commandHelper.jitCmd('add', '.');
    commandHelper.commit('C');
    clock.tick(1000);
  });

  afterEach(function() {
    clock.restore();

    commandHelper.afterEach();
  });

  it('merge with clonficts', function() {
    commandHelper.jitCmd('checkout', 'master');
    commandHelper.merge('topic', 'M');
    commandHelper.jitCmd('diff', '--base');
    commandHelper.assertStdout([
      '* Unmerged path f.txt',
      'diff --git a/f.txt b/f.txt',
      'index 43dd47e..e2a2387 100644',
      '--- a/f.txt',
      '+++ b/f.txt',
      '@@ -1,1 +1,5 @@',
      '-one',
      '+<<<<<<< @',
      '+two',
      '+=======',
      '+three',
      '+>>>>>>> topic',
    ].join('\n') + '\n');
    commandHelper.jitCmd('diff', '--ours');
    commandHelper.assertStdout([
      '* Unmerged path f.txt',
      'diff --git a/f.txt b/f.txt',
      'index 64c5e58..e2a2387 100644',
      '--- a/f.txt',
      '+++ b/f.txt',
      '@@ -1,1 +1,5 @@',
      '+<<<<<<< @',
      ' two',
      '+=======',
      '+three',
      '+>>>>>>> topic',
    ].join('\n') + '\n');
    commandHelper.jitCmd('diff', '--theirs');
    commandHelper.assertStdout([
      '* Unmerged path f.txt',
      'diff --git a/f.txt b/f.txt',
      'index 1d19714..e2a2387 100644',
      '--- a/f.txt',
      '+++ b/f.txt',
      '@@ -1,1 +1,5 @@',
      '+<<<<<<< @',
      '+two',
      '+=======',
      ' three',
      '+>>>>>>> topic',
    ].join('\n') + '\n');
  });

});
