const sinon = require('sinon');
const assert = require('assert');

const CommandHelper = require('../../test_helpers/command.helper');

describe('Command::Log', function() {

  const commandHelper = new CommandHelper();
  let clock;

  beforeEach(function() {
    clock = sinon.useFakeTimers({
        now: new Date(2019, 1, 1, 15, 30),
        shouldAdvanceTime: true,
        advanceTimeDelta: 20
    });

    commandHelper.beforeEach();
    commandHelper.writeFile('A.txt', 'A');
    commandHelper.jitCmd('add', 'A.txt');
    commandHelper.commit('commit message A');
    clock.tick(1000);

    commandHelper.writeFile('B.txt', 'B');
    commandHelper.jitCmd('add', 'B.txt');
    commandHelper.commit('commit message B');
    clock.tick(1000);

    commandHelper.jitCmd('branch', 'topic');
    commandHelper.jitCmd('checkout', 'topic');
    commandHelper.writeFile('E.txt', 'E');
    commandHelper.jitCmd('add', 'E.txt');
    commandHelper.commit('commit message E');
    clock.tick(1000);

    commandHelper.jitCmd('checkout', 'master');
    commandHelper.writeFile('C.txt', 'C');
    commandHelper.jitCmd('add', 'C.txt');
    commandHelper.commit('commit message C');
    clock.tick(1000);

    commandHelper.jitCmd('checkout', 'topic');
    commandHelper.writeFile('F.txt', 'F');
    commandHelper.jitCmd('add', 'F.txt');
    commandHelper.commit('commit message F');
    clock.tick(1000);

    commandHelper.jitCmd('checkout', 'master');
    commandHelper.writeFile('D.txt', 'D');
    commandHelper.jitCmd('add', 'D.txt');
    commandHelper.commit('commit message D');
    clock.tick(1000);
    
    commandHelper.jitCmd('checkout', 'topic');
    commandHelper.writeFile('G.txt', 'G');
    commandHelper.jitCmd('add', 'G.txt');
    commandHelper.commit('commit message G');
    clock.tick(1000);

    commandHelper.jitCmd('checkout', 'master');
  });

  afterEach(function() {
    clock.restore();

    commandHelper.afterEach();
  });

  it('git log two branches history', function() {
    commandHelper.jitCmd('log', '--oneline', '--decorate', 'master', 'topic');
    commandHelper.assertStdout([
      'b99d3c9 (topic) commit message G',
      'd4440c6 (HEAD -> master) commit message D',
      'fb06b12 commit message F',
      '05fe457 commit message C',
      '0627e51 commit message E',
      '4672311 commit message B',
      '05a1eb4 commit message A',
    ].join('\n') + '\n');
  });

  it('git log excluding branch ^topic and including branch master', function() {
    commandHelper.jitCmd('log', '--oneline', '--decorate', '^topic', 'master');
    commandHelper.assertStdout([
      'd4440c6 (HEAD -> master) commit message D',
      '05fe457 commit message C',
    ].join('\n') + '\n');
  });

  it('git log excluding branch topic and including branch master using range operator (topic..master) and also showinging the patches', function() {
    commandHelper.jitCmd('log', '--oneline', '--decorate', '--patch', 'topic..master');
    commandHelper.assertStdout([
      'd4440c6 (HEAD -> master) commit message D',
      'diff --git a/D.txt b/D.txt',
      'new file mode 100644',
      'index 0000000..02358d2',
      '--- /dev/null',
      '+++ b/D.txt',
      '@@ -0,0 +1,1 @@',
      '+D',
      '05fe457 commit message C',
      'diff --git a/C.txt b/C.txt',
      'new file mode 100644',
      'index 0000000..96d80cd',
      '--- /dev/null',
      '+++ b/C.txt',
      '@@ -0,0 +1,1 @@',
      '+C',
    ].join('\n') + '\n');
  });

});
