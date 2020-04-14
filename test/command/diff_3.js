const sinon = require('sinon');
const assert = require('assert');

const CommandHelper = require('../../test_helpers/command.helper');

describe('Command::Diff', function() {

  const commandHelper = new CommandHelper();
  let clock;

  const o = [
    'celery',
    'garlic',
    'onions',
    'salmon',
    'tomatoes',
    'wine',
  ].join('\n');

  const a = [
    'celery',
    'salmon',
    'tomatoes',
    'garlic',
    'onions',
    'wine',
  ].join('\n');

  const b = [
    'celery',
    'salmon',
    'garlic',
    'onions',
    'tomatoes',
    'wine',
  ].join('\n');

  beforeEach(function() {
    clock = sinon.useFakeTimers({
        now: new Date(2019, 1, 1, 0, 0),
        shouldAdvanceTime: true,
        advanceTimeDelta: 20
    });

    commandHelper.beforeEach();
    commandHelper.writeFile('f.txt', o);
    commandHelper.jitCmd('add', '.');
    commandHelper.commit('A');
    clock.tick(1000);

    commandHelper.writeFile('f.txt', a);
    commandHelper.jitCmd('add', '.');
    commandHelper.commit('B');
    clock.tick(1000);

    commandHelper.jitCmd('branch', 'topic', '@^');
    commandHelper.jitCmd('checkout', 'topic');
    commandHelper.writeFile('f.txt', b);
    commandHelper.jitCmd('add', '.');
    commandHelper.commit('C');
    clock.tick(1000);
  });

  afterEach(function() {
    clock.restore();

    commandHelper.afterEach();
  });

  it('diff --merge after merge with clonficts', function() {
    commandHelper.jitCmd('checkout', 'master');
    commandHelper.merge('topic', 'M');
    commandHelper.jitCmd('diff', '--base');
    commandHelper.assertStdout([
      '* Unmerged path f.txt',
      'diff --git a/f.txt b/f.txt',
      'index 4b1cd93..c283eb3 100644',
      '--- a/f.txt',
      '+++ b/f.txt',
      '@@ -1,6 +1,12 @@',
      ' celery',
      '+<<<<<<< @',
      '+salmon',
      '+=======',
      '+salmon',
      ' garlic',
      ' onions',
      '-salmon',
      '+>>>>>>> topic',
      ' tomatoes',
      '+garlic',
      '+onions',
      ' wine',
    ].join('\n') + '\n');
    commandHelper.jitCmd('diff', '--ours');
    commandHelper.assertStdout([
      '* Unmerged path f.txt',
      'diff --git a/f.txt b/f.txt',
      'index 1df9283..c283eb3 100644',
      '--- a/f.txt',
      '+++ b/f.txt',
      '@@ -1,5 +1,11 @@',
      ' celery',
      '+<<<<<<< @',
      ' salmon',
      '+=======',
      '+salmon',
      '+garlic',
      '+onions',
      '+>>>>>>> topic',
      ' tomatoes',
      ' garlic',
      ' onions',
    ].join('\n') + '\n');
    commandHelper.jitCmd('diff', '--theirs');
    commandHelper.assertStdout([
      '* Unmerged path f.txt',
      'diff --git a/f.txt b/f.txt',
      'index 65e5ca1..c283eb3 100644',
      '--- a/f.txt',
      '+++ b/f.txt',
      '@@ -1,6 +1,12 @@',
      ' celery',
      '+<<<<<<< @',
      ' salmon',
      '+=======',
      '+salmon',
      ' garlic',
      ' onions',
      '+>>>>>>> topic',
      ' tomatoes',
      '+garlic',
      '+onions',
      ' wine',
    ].join('\n') + '\n');
  });

});
