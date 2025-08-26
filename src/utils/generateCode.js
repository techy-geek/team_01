
const { customAlphabet } = require('nanoid');
const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no lookalikes
const nanoid = customAlphabet(alphabet, 6);

function generateJoinCode() {
  return nanoid(); // 6-char uppercase code
}

module.exports = generateJoinCode;
