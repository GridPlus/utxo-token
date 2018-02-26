// Tests of the UTXO token contract
const ethutil = require('ethereumjs-util');
const leftPad = require('left-pad');
const UTXOToken = artifacts.require('UTXOToken.sol');
let token;
let tokenId1;
let tokenId2;
let tokenId3;

contract('UTXOToken', (accounts) => {
  describe('Create, send, sendOnBehalf', () => {
    it('Should deploy a token contract', async () => {
      token = await UTXOToken.new(0, 'Token', 'T');
      const admin = await token.admin();
      assert(admin === accounts[0]);
    });

    it('Should create a 10 unit UTXO', async () => {
      const txhash = await token.create(accounts[1], 10, { from: accounts[0] });
      tokenId1 = txhash.logs[0].args.id;
      const record = await token.getUtxo(tokenId1);
      assert(record[0] === accounts[1]);
    });

    it('Should spend 2 units to accounts[2]', async () => {
      const txhash = await token.spend(tokenId1, 2, accounts[2], { from: accounts[1] });
      tokenId2 = txhash.logs[0].args.newId;
      tokenId3 = txhash.logs[1].args.newId;
      const token2 = await token.getUtxo(tokenId2);
      assert(parseInt(token2[1]) === 2);
      assert(token2[0] === accounts[2]);
      const token3 = await token.getUtxo(tokenId3);
      assert(parseInt(token3[1]) === 8);
      assert(token3[0] === accounts[1]);
    });

    it('Should authorize accounts[3] to spend 1 unit', async () => {
      // console.log('token', Object.keys(token.contract._eth.sign))
      const expiration = Math.floor(new Date().getTime()/1000) + 10000;
      let toSign = `${tokenId2}${leftPad(1, 64, '0')}${leftPad(expiration.toString(16), 64, '0')}`
      toSign += `${leftPad(accounts[3].slice(2), 64, '0')}`;
      const hash = '0x' + ethutil.sha3(toSign).toString('hex');
      console.log('hash', hash)
      const sig = await token.contract._eth.sign(accounts[1], hash);
      const r = sig.substr(0, 66);
      const s = '0x' + sig.substr(66, 130);
      const v = parseInt('0x' + sig.slice(130));

      const signer = ethutil.ecrecover(Buffer.from(hash.slice(2), 'hex'), v + 27, Buffer.from(r, 'hex'), Buffer.from(s, 'hex'));
      console.log('signer', signer)

      // const hash = await token.checkSpender(tokenId2, 1, expiration, accounts[4], r, s, v, { from: accounts[3] });
      // console.log('hash', hash);
    });

  });
});
