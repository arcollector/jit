const child_process = require('child_process');

const Protocol = require('./lib/remotes/protocol');

const child = child_process.spawn(
  'node',
  ['adder.js'],
  {
    stdio: [ 'pipe', 'pipe', process.stderr ]
  }
);

// segundo param es el input
// tercer param es el output
const conn = new Protocol(
  '',
  child.stdout,
  child.stdin,
  // onEach
  (sum) => console.log('result', sum),
  // completion trigger
  null,
  // onComplete
  () => null
);

Array(10).fill(0).map((_, i) => i+1).forEach((n) => {
  // aca mando al stdout mi numero
  // que en mi caso stdout es el stdin de child!
  // aca child deberia darse cuenta que el estoy enviando
  // ya que mi child esta en while true!!! corriendo
  conn.sendPacket(n.toString());
});
conn.sendPacket(null);

