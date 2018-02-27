// Tests of the UTXO token contract
const ethutil = require('ethereumjs-util');
const leftPad = require('left-pad');
const UTXOToken = artifacts.require('UTXOToken.sol');
const sha3 = require('solidity-sha3').default;
let token;
let tokenId1;
let tokenId2;
let tokenId3;
const privKey = '67ab863e0846e670d33b94286fdbf50045d45a63717b6035aca4699a84097a4d';
const addr = '0xaaae9b59198e2574128a971b624a6a86ce3ee614'

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

    it('Should spend 2 units to addr', async () => {
      const txhash = await token.spend(tokenId1, 2, addr, { from: accounts[1] });
      tokenId2 = txhash.logs[0].args.newId;
      tokenId3 = txhash.logs[1].args.newId;
      const token2 = await token.getUtxo(tokenId2);
      assert(parseInt(token2[1]) === 2);
      assert(token2[0] === addr);
      const token3 = await token.getUtxo(tokenId3);
      assert(parseInt(token3[1]) === 8);
      assert(token3[0] === accounts[1]);
    });

    it('Should authorize accounts[3] to spend 1 unit', async () => {
      const expiration = Math.floor(new Date().getTime()/1000) + 10000;
      let toSign = `${tokenId2}${leftPad(1, 64, '0')}${accounts[3].slice(2)}`;
      toSign += `${leftPad(expiration.toString(16), 64, '0')}`;
      const hash = sha3(toSign);
      const bHash = Buffer.from(hash.slice(2), 'hex');
      const sig = ethutil.ecsign(bHash, Buffer.from(privKey, 'hex'));
      const signerPubKey = ethutil.ecrecover(bHash, sig.v, sig.r, sig.s);
      const signer = ethutil.publicToAddress(signerPubKey).toString('hex');
      assert('0x' + signer === addr);
      const r = '0x' + sig.r.toString('hex');
      const s = '0x' + sig.s.toString('hex');
      const txHash = await token.spendOnBehalf(tokenId2, 1, expiration, accounts[3], r, s, sig.v);
      assert(txHash.logs.length === 2);
      assert(parseInt(txHash.logs[0].args.newValue) === 1);
      assert(parseInt(txHash.logs[1].args.newValue) === 1);
    });
  });
});
