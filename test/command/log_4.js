const sinon = require('sinon');
const assert = require('assert');

const CommandHelper = require('../../test_helpers/command.helper');

describe('Command::Log', function() {

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

  it('log --cc after merge with clonficts', function() {
    commandHelper.jitCmd('checkout', 'master');
    commandHelper.merge('topic', 'M');
    commandHelper.jitCmd('log', '--cc');
    commandHelper.assertStdout([
      'commit 88dc95857825746114af478d10987daf20c12694',
      'Author A. U. Thor <author@example.com>',
      'Date: Fri Feb 01 00:00:01 2019 -0300',
      '',
      '\tB',
      '',
      'diff --git a/f.txt b/f.txt',
      'index 4b1cd93..1df9283 100644',
      '--- a/f.txt',
      '+++ b/f.txt',
      '@@ -1,6 +1,6 @@',
      ' celery',
      '-garlic',
      '-onions',
      ' salmon',
      ' tomatoes',
      '+garlic',
      '+onions',
      ' wine',
      '',
      'commit a67d6cd62607e18ece79782c9165a1db475b0139',
      'Author A. U. Thor <author@example.com>',
      'Date: Fri Feb 01 00:00:00 2019 -0300',
      '',
      '\tA',
      '',
      'diff --git a/f.txt b/f.txt',
      'new file mode 100644',
      'index 0000000..4b1cd93',
      '--- /dev/null',
      '+++ b/f.txt',
      '@@ -0,0 +1,6 @@',
      '+celery',
      '+garlic',
      '+onions',
      '+salmon',
      '+tomatoes',
      '+wine',
    ].join('\n') + '\n');
  });

});
