const Protocol = require('./lib/remotes/protocol');

const numbers = [];
const conn = new Protocol(
  '',
  process.stdin,
  process.stdout,
  // onEach
  (n) => {
    console.error('onEach', n);
    numbers.push(parseInt(n));
  },
  // completionTrigger
  null,
  // onComplete
  () => {
    console.error('onComplete');
    const sum = numbers.reduce((acc, cur) => acc + cur, 0);
    conn.sendPacket(sum);
  }
);

