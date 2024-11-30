#!/usr/bin/env node

const dogecore = require('./bitcore-lib-pepe')
const fs = require('fs')
const dotenv = require('dotenv')
const mime = require('mime-types')
const { PrivateKey, Address, Transaction, Script, Opcode } = dogecore
const { Hash, Signature } = dogecore.crypto

dotenv.config();

if (process.env.TESTNET == 'true') {
   dogecore.Networks.defaultNetwork = dogecore.Networks.testnet;
}

if (process.env.FEE_PER_KB) {
   Transaction.FEE_PER_KB = parseInt(process.env.FEE_PER_KB);
} else {
   Transaction.FEE_PER_KB = 40000000;
}

async function main() {
   let cmd = process.argv[2];

   if (cmd === 'mint') {
       await mint();
   } else if (cmd === 'send') {
       await send(); // Added 'send' command handling
   } else {
       throw new Error(`unknown command: ${cmd}`);
   }
}

const MAX_SCRIPT_ELEMENT_SIZE = 520;

async function mint() {
    // Expected command format:
    // mint <address> <contentType> <hexData> <sendingAddress> <privKey> <txId> <vout> <script> <satoshis>
    
    if (process.argv.length !== 12) {
        throw new Error(`Invalid number of arguments for 'mint' command.
Expected format:
mint <address> <contentType> <hexData> <sendingAddress> <privKey> <txId> <vout> <script> <satoshis>

Example:
mint LKDVJJRLA9fYBoU2mKFHzdTRMfpM3gQzfP image/webp 5249464636030000...  LKDVJJRLA9fYBoU2mKFHzdTRMfpM3gQzfP SuZdphgzHbs4wJtPBnv4HH7bWa4PChE7ZKbnRBuVsUL16oR8wpSj b64ebb6e1eb9fb7ec8205fac5033fc970a37d52d9de402d57f6d5f9e0225b7f8 0 76a914ffe97dd8bb7d8fb9e3c74fe463f339d7f50a819c88ac 110000000`);
    }

    const argAddress = process.argv[3];
    const contentType = process.argv[4];
    const hexData = process.argv[5];
    const argSendingAddress = process.argv[6];
    const argPrivKey = process.argv[7];
    const argTxId = process.argv[8];
    const argVout = parseInt(process.argv[9]);
    const argScript = process.argv[10];
    const argSatoshis = parseInt(process.argv[11]);

    if (!/^[a-fA-F0-9]*$/.test(hexData)) {
        throw new Error('Data must be a valid hex string.');
    }

    const data = Buffer.from(hexData, 'hex');

    if (data.length === 0) {
        throw new Error('No data to mint.');
    }

    if (contentType.length > MAX_SCRIPT_ELEMENT_SIZE) {
        throw new Error('Content type too long.');
    }

    let address = new Address(argAddress);
    let wallet = {
        privkey: argPrivKey,
        address: argSendingAddress,
        utxos: [
            {
                txid: argTxId,
                vout: argVout,
                script: argScript,
                satoshis: argSatoshis
            }
        ]
    };

    let txs = inscribe(wallet, address, contentType, data);

    await broadcastAll(txs, false);
}

async function broadcastAll(txs, retry) {
   const pendingTransactions = txs.map((tx, index) => ({
       transactionNumber: index + 1,
       txid: tx.hash,
       hex: tx.toString()
   }));

   // Output only the pendingTransactions JSON
   console.log(JSON.stringify({ pendingTransactions }, null, 2));
}

function bufferToChunk(b, type) {
   b = Buffer.from(b, type); // Ensure Buffer.from() is used
   return {
       buf: b.length ? b : undefined,
       len: b.length,
       opcodenum: b.length <= 75 ? b.length : b.length <= 255 ? 76 : 77
   };
}

function numberToChunk(n) {
   return {
       buf: n <= 16 ? undefined : n < 128 ? Buffer.from([n]) : Buffer.from([n % 256, Math.floor(n / 256)]), // Ensure Buffer.from() is used
       len: n <= 16 ? 0 : n < 128 ? 1 : 2,
       opcodenum: n === 0 ? 0 : n <= 16 ? 80 + n : n < 128 ? 1 : 2
   };
}

function opcodeToChunk(op) {
   return { opcodenum: op };
}

const MAX_CHUNK_LEN = 240;
const MAX_PAYLOAD_LEN = 1500;

function inscribe(wallet, address, contentType, data) {
    let txs = [];
    let privateKey = new PrivateKey(wallet.privkey);
    let publicKey = privateKey.toPublicKey();
    let parts = [];
    let inscription = new Script();

    // Split data into chunks
    while (data.length) {
        let part = data.slice(0, Math.min(MAX_CHUNK_LEN, data.length));
        data = data.slice(part.length);
        parts.push(part);
    }

    // Construct the inscription script
    inscription.chunks.push(bufferToChunk('ord'));
    inscription.chunks.push(numberToChunk(parts.length));
    inscription.chunks.push(bufferToChunk(contentType));
    parts.forEach((part, n) => {
        inscription.chunks.push(numberToChunk(parts.length - n - 1));
        inscription.chunks.push(bufferToChunk(part));
    });

    let p2shInput;
    let lastLock;
    let lastPartial;

    while (inscription.chunks.length) {
        let partial = new Script();

        if (txs.length === 0) {
            partial.chunks.push(inscription.chunks.shift());
        }

        while (partial.toBuffer().length <= MAX_PAYLOAD_LEN && inscription.chunks.length) {
            partial.chunks.push(inscription.chunks.shift());
            if (inscription.chunks.length === 0) break; // Prevent shifting undefined
            partial.chunks.push(inscription.chunks.shift());
        }

        if (partial.toBuffer().length > MAX_PAYLOAD_LEN) {
            inscription.chunks.unshift(partial.chunks.pop());
            inscription.chunks.unshift(partial.chunks.pop());
        }

        let lock = new Script();
        lock.chunks.push(bufferToChunk(publicKey.toBuffer()));
        lock.chunks.push(opcodeToChunk(Opcode.OP_CHECKSIGVERIFY));
        partial.chunks.forEach(() => {
            lock.chunks.push(opcodeToChunk(Opcode.OP_DROP));
        });
        lock.chunks.push(opcodeToChunk(Opcode.OP_TRUE));

        let lockhash = Hash.ripemd160(Hash.sha256(lock.toBuffer()));

        let p2sh = new Script();
        p2sh.chunks.push(opcodeToChunk(Opcode.OP_HASH160));
        p2sh.chunks.push(bufferToChunk(lockhash));
        p2sh.chunks.push(opcodeToChunk(Opcode.OP_EQUAL));

        let p2shOutput = new Transaction.Output({
            script: p2sh,
            satoshis: 100000
        });

        let tx = new Transaction();
        if (p2shInput) tx.addInput(p2shInput);
        tx.addOutput(p2shOutput);
        fund(wallet, tx);

        if (p2shInput) {
            let signature = Transaction.sighash.sign(tx, privateKey, Signature.SIGHASH_ALL, 0, lastLock);
            let txsignature = Buffer.concat([signature.toBuffer(), Buffer.from([Signature.SIGHASH_ALL])]); // Ensure Buffer.from() is used

            let unlock = new Script();
            unlock.chunks = unlock.chunks.concat(lastPartial.chunks);
            unlock.chunks.push(bufferToChunk(txsignature));
            unlock.chunks.push(bufferToChunk(lastLock.toBuffer()));
            tx.inputs[0].setScript(unlock);
        }

        updateWallet(wallet, tx);
        txs.push(tx);


        if (tx.outputs.length > 0) {
            p2shInput = new Transaction.Input({
                prevTxId: tx.hash,
                outputIndex: 0,
                output: tx.outputs[0],
                script: ''
            });

            p2shInput.clearSignatures = () => {};
            p2shInput.getSignatures = () => {};
        } else {
            console.error('Transaction output is missing, cannot create input for next transaction.');
            break;
        }

        lastLock = lock;
        lastPartial = partial;
    }

    let finalTx = new Transaction();
    if (p2shInput) {
        finalTx.addInput(p2shInput);
        finalTx.to(address, 100000);
        fund(wallet, finalTx);

        let signature = Transaction.sighash.sign(finalTx, privateKey, Signature.SIGHASH_ALL, 0, lastLock);
        let txsignature = Buffer.concat([signature.toBuffer(), Buffer.from([Signature.SIGHASH_ALL])]); // Ensure Buffer.from() is used

        let unlock = new Script();
        unlock.chunks = unlock.chunks.concat(lastPartial.chunks);
        unlock.chunks.push(bufferToChunk(txsignature));
        unlock.chunks.push(bufferToChunk(lastLock.toBuffer()));
        finalTx.inputs[0].setScript(unlock);

        updateWallet(wallet, finalTx);
        txs.push(finalTx);

        // Log final transaction details
        console.log(`Final transaction: ${finalTx.hash}`);
    } else {
        console.error('Failed to create final transaction due to missing input.');
    }

    return txs;
}

function fund(wallet, tx) {
    tx.change(wallet.address);
    delete tx._fee;

    if (tx.inputs.length && tx.outputs.length && tx.inputAmount >= tx.outputAmount + tx.getFee()) {
        return;
    }

    delete tx._fee;
    tx.from(wallet.utxos[0]);
    tx.change(wallet.address);
    tx.sign(wallet.privkey);

    if (tx.inputAmount < tx.outputAmount + tx.getFee()) {
        throw new Error('Not enough funds.');
    }
}

function updateWallet(wallet, tx) {
   wallet.utxos = wallet.utxos.filter(utxo => {
       for (const input of tx.inputs) {
           if (input.prevTxId.toString('hex') === utxo.txid && input.outputIndex === utxo.vout) {
               return false;
           }
       }
       return true;
   });

   tx.outputs.forEach((output, vout) => {
       if (output.script.toAddress().toString() === wallet.address) {
           wallet.utxos.push({
               txid: tx.hash,
               vout,
               script: output.script.toHex(),
               satoshis: output.satoshis
           });
       }
   });
}

function chunkToNumber(chunk) {
   if (chunk.opcodenum === 0) return 0;
   if (chunk.opcodenum === 1) return chunk.buf[0];
   if (chunk.opcodenum === 2) return chunk.buf[1] * 255 + chunk.buf[0];
   if (chunk.opcodenum > 80 && chunk.opcodenum <= 96) return chunk.opcodenum - 80;
   return undefined;
}

async function send() {
  // Expected command format:
  // send <recipientAddress> <amountToSend> <privKey> <feeUtxo_txid> <feeUtxo_vout> <feeUtxo_script> <feeUtxo_satoshis> [<utxo1_txid> <utxo1_vout> <utxo1_script> <utxo1_satoshis> ...]

  if (process.argv.length < 10 || ((process.argv.length - 6) % 4 !== 0)) {
    throw new Error(`Invalid number of arguments for 'send' command.
Expected format:
send <recipientAddress> <amountToSend> <privKey> <feeUtxo_txid> <feeUtxo_vout> <feeUtxo_script> <feeUtxo_satoshis> [<utxo1_txid> <utxo1_vout> <utxo1_script> <utxo1_satoshis> ...]

Example:
send LKDVJJRLA9fYBoU2mKFHzdTRMfpM3gQzfP 100000000 SuZdphgzHbs4wJtPBnv4HH7bWa4PChE7ZKbnRBuVsUL16oR8wpSj \
fee_txid fee_vout fee_script fee_satoshis \
b64ebb6e1eb9fb7ec8205fac5033fc970a37d52d9de402d57f6d5f9e0225b7f8 0 76a914ffe97dd8bb7d8fb9e3c74fe463f339d7f50a819c88ac 110000000`);
  }

  const recipientAddress = process.argv[3];
  const amountToSend = parseInt(process.argv[4]);
  const privKey = process.argv[5];

  // Fee UTXO
  const feeUtxo = {
    txid: process.argv[6],
    outputIndex: parseInt(process.argv[7]),
    script: process.argv[8],
    satoshis: parseInt(process.argv[9]),
  };

  // Remaining UTXOs
  const utxoArgs = process.argv.slice(10);
  const utxoCount = utxoArgs.length / 4;
  const utxos = [];

  for (let i = 0; i < utxoCount; i++) {
    const txid = utxoArgs[i * 4];
    const vout = parseInt(utxoArgs[i * 4 + 1]);
    const script = utxoArgs[i * 4 + 2];
    const satoshis = parseInt(utxoArgs[i * 4 + 3]);

    utxos.push({
      txid: txid,
      outputIndex: vout,
      script: script,
      satoshis: satoshis,
    });
  }

  const wallet = {
    privkey: privKey,
    address: new PrivateKey(privKey).toAddress().toString(),
    utxos: utxos,
  };

  const txHex = createTransaction(wallet, recipientAddress, amountToSend, feeUtxo);
  console.log(txHex);
}

function createTransaction(wallet, recipientAddress, amountToSend, feeUtxo) {
  const privateKey = new PrivateKey(wallet.privkey);
  const senderAddress = privateKey.toAddress();

  let tx = new Transaction();

  // Include fee UTXO
  tx.from(feeUtxo);

  // Add other UTXOs
  tx.from(wallet.utxos);

  tx.to(recipientAddress, amountToSend);
  tx.change(senderAddress);

  // Optionally set a custom fee per kb
  if (process.env.FEE_PER_KB) {
    tx.feePerKb(parseInt(process.env.FEE_PER_KB));
  } else {
    tx.feePerKb(Transaction.FEE_PER_KB);
  }

  tx.sign(privateKey);

  // Verify that the total input amount covers the outputs and fee
  const totalInput = tx.inputs.reduce((sum, input) => sum + input.output.satoshis, 0);
  const totalOutput = tx.outputs.reduce((sum, output) => sum + output.satoshis, 0) + tx.getFee();

  if (totalInput < totalOutput) {
    throw new Error('Not enough funds to cover the amount and transaction fee.');
  }

  return tx.serialize();
}

main().catch(e => {
   let reason = e.response && e.response.data && e.response.data.error && e.response.data.error.message;
   console.error(reason ? e.message + ':' + reason : e.message);
});