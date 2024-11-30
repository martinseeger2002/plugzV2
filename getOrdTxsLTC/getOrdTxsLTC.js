#!/usr/bin/env node

const litecore = require('bitcore-lib-ltc');
const fs = require('fs')
const dotenv = require('dotenv')
const mime = require('mime-types')
const { PrivateKey, Address, Transaction, Script, Opcode } = litecore
const { Hash, Signature } = litecore.crypto

dotenv.config()

if (process.env.TESTNET == 'true') {
   litecore.Networks.defaultNetwork = litecore.Networks.testnet
}

if (process.env.FEE_PER_KB) {
   Transaction.FEE_PER_KB = parseInt(process.env.FEE_PER_KB)
} else {
   Transaction.FEE_PER_KB = 15000000
}

async function main() {
   let cmd = process.argv[2]

   if (cmd == 'mint') {
       await mint()
   } else {
       throw new Error(`unknown command: ${cmd}`)
   }
}

const MAX_SCRIPT_ELEMENT_SIZE = 520

async function mint() {
    const argAddress = process.argv[3];
    const argContentTypeOrFilename = process.argv[4];

    let contentType;
    let data;
    let argSendingAddress, argPrivKey, argTxId, argVout, argScript, argSatoshis;

    if (fs.existsSync(argContentTypeOrFilename)) {
        // If the argument is a file path, read the file
        contentType = mime.contentType(mime.lookup(argContentTypeOrFilename));
        data = fs.readFileSync(argContentTypeOrFilename);

        // Set subsequent arguments
        argSendingAddress = process.argv[5];
        argPrivKey = process.argv[6];
        argTxId = process.argv[7];
        argVout = parseInt(process.argv[8]);
        argScript = process.argv[9];
        argSatoshis = parseInt(process.argv[10]);
    } else {
        // If the argument is not a file path, treat it as content type
        contentType = argContentTypeOrFilename;
        const hexData = process.argv[5]; // Assume the next argument is the hex data
        if (!/^[a-fA-F0-9]*$/.test(hexData)) throw new Error('data must be hex');
        data = Buffer.from(hexData, 'hex');

        // Update subsequent arguments
        argSendingAddress = process.argv[6];
        argPrivKey = process.argv[7];
        argTxId = process.argv[8];
        argVout = parseInt(process.argv[9]);
        argScript = process.argv[10];
        argSatoshis = parseInt(process.argv[11]);
    }

    if (data.length == 0) {
        throw new Error('no data to mint');
    }

    if (contentType.length > MAX_SCRIPT_ELEMENT_SIZE) {
        throw new Error('content type too long');
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

   const output = {
       pendingTransactions,
       instructions: "Broadcast each transaction individually starting with transaction 1."
   };

   console.log(JSON.stringify(output, null, 2)); // Pretty print the JSON
}

function bufferToChunk(b, type) {
   b = Buffer.from(b, type)
   return {
       buf: b.length ? b : undefined,
       len: b.length,
       opcodenum: b.length <= 75 ? b.length : b.length <= 255 ? 76 : 77
   }
}

function numberToChunk(n) {
   return {
       buf: n <= 16 ? undefined : n < 128 ? Buffer.from([n]) : Buffer.from([n % 256, n / 256]),
       len: n <= 16 ? 0 : n < 128 ? 1 : 2,
       opcodenum: n == 0 ? 0 : n <= 16 ? 80 + n : n < 128 ? 1 : 2
   }
}


function opcodeToChunk(op) {
   return { opcodenum: op }
}

const MAX_CHUNK_LEN = 240
const MAX_PAYLOAD_LEN = 1500

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

        if (txs.length == 0) {
            partial.chunks.push(inscription.chunks.shift());
        }

        while (partial.toBuffer().length <= MAX_PAYLOAD_LEN && inscription.chunks.length) {
            partial.chunks.push(inscription.chunks.shift());
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
            satoshis: 5000000
        });

        let tx = new Transaction();
        if (p2shInput) tx.addInput(p2shInput);
        tx.addOutput(p2shOutput);
        fund(wallet, tx);

        if (p2shInput) {
            let signature = Transaction.sighash.sign(tx, privateKey, Signature.SIGHASH_ALL, 0, lastLock);
            let txsignature = Buffer.concat([signature.toBuffer(), Buffer.from([Signature.SIGHASH_ALL])]);

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

    let tx = new Transaction();
    if (p2shInput) {
        tx.addInput(p2shInput);
        tx.to(address, 1000000);
        fund(wallet, tx);

        let signature = Transaction.sighash.sign(tx, privateKey, Signature.SIGHASH_ALL, 0, lastLock);
        let txsignature = Buffer.concat([signature.toBuffer(), Buffer.from([Signature.SIGHASH_ALL])]);

        let unlock = new Script();
        unlock.chunks = unlock.chunks.concat(lastPartial.chunks);
        unlock.chunks.push(bufferToChunk(txsignature));
        unlock.chunks.push(bufferToChunk(lastLock.toBuffer()));
        tx.inputs[0].setScript(unlock);

        updateWallet(wallet, tx);
        txs.push(tx);

        // Log final transaction details
        console.log(`Final transaction: ${tx.hash}`);
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
        throw new Error('not enough funds');
    }
}

function updateWallet(wallet, tx) {
   wallet.utxos = wallet.utxos.filter(utxo => {
       for (const input of tx.inputs) {
           if (input.prevTxId.toString('hex') == utxo.txid && input.outputIndex == utxo.vout) {
               return false
           }
       }
       return true
   })

   tx.outputs
       .forEach((output, vout) => {
           if (output.script.toAddress().toString() == wallet.address) {
               wallet.utxos.push({
                   txid: tx.hash,
                   vout,
                   script: output.script.toHex(),
                   satoshis: output.satoshis
               })
           }
       })
}

function chunkToNumber(chunk) {
   if (chunk.opcodenum == 0) return 0
   if (chunk.opcodenum == 1) return chunk.buf[0]
   if (chunk.opcodenum == 2) return chunk.buf[1] * 255 + chunk.buf[0]
   if (chunk.opcodenum > 80 && chunk.opcodenum <= 96) return chunk.opcodenum - 80
   return undefined
}


main().catch(e => {
   let reason = e.response && e.response.data && e.response.data.error && e.response.data.error.message
   console.error(reason ? e.message + ':' + reason : e.message)
})
