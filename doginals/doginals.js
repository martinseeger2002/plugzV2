#!/usr/bin/env node


const dogecore = require('bitcore-lib-doge')
const axios = require('axios')
const fs = require('fs')
const dotenv = require('dotenv')
const mime = require('mime-types')
const express = require('express')
const { PrivateKey, Address, Transaction, Script, Opcode } = dogecore
const { Hash, Signature } = dogecore.crypto


dotenv.config()


if (process.env.TESTNET == 'true') {
   dogecore.Networks.defaultNetwork = dogecore.Networks.testnet
}


if (process.env.FEE_PER_KB) {
   Transaction.FEE_PER_KB = parseInt(process.env.FEE_PER_KB)
} else {
   Transaction.FEE_PER_KB = 100000000
}


async function main(cmd, ...args) {

    if (cmd == 'mint') {
        await mint(...args);
    } else if (cmd == 'wallet') {
        await wallet(...args);
    } else if (cmd == 'server') {
        await server(...args);
    } else if (cmd == 'drc-20') {
        await doge20(...args);
    } else {
        throw new Error(`unknown command: ${cmd}`);
    }
}


async function doge20(subcmd, ...args) {
   if (subcmd === 'mint') {
       await doge20Transfer("mint", ...args);
   } else if (subcmd === 'transfer') {
       await doge20Transfer(...args);
   } else if (subcmd === 'deploy') {
       await doge20Deploy(...args);
   } else {
       throw new Error(`unknown subcommand: ${subcmd}`);
   }
}


async function wallet(subcmd, ...args) {
    if (subcmd == 'new') {
        walletNew(...args);
    } else if (subcmd == 'sync') {
        await walletSync(...args);
    } else if (subcmd == 'balance') {
        walletBalance(...args);
    } else if (subcmd == 'send') {
        await walletSend(...args);
    } else if (subcmd == 'split') {
        await walletSplit(...args);
    } else if (subcmd == 'brocastraw') {
        await walletBroadcastRaw(...args);
    } else {
        throw new Error(`unknown subcommand: ${subcmd}`);
    }
}


async function doge20Deploy(argAddress, argTicker, argMax, argLimit) {
 const doge20Tx = {
   p: "drc-20",
   op: "deploy",
   tick: `${argTicker.toLowerCase()}`,
   max: `${argMax}`,
   lim: `${argLimit}`
 };


 const parsedDoge20Tx = JSON.stringify(doge20Tx);


 // encode the doge20Tx as hex string
 const encodedDoge20Tx = Buffer.from(parsedDoge20Tx).toString('hex');


 console.log("Deploying drc-20 token...");
 await mint(argAddress, "text/plain;charset=utf-8", encodedDoge20Tx);
}


async function doge20Transfer(op = "transfer", argAddress, argTicker, argAmount, argRepeat) {
 const doge20Tx = {
   p: "drc-20",
   op,
   tick: `${argTicker.toLowerCase()}`,
   amt: `${argAmount}`
 };


 const parsedDoge20Tx = JSON.stringify(doge20Tx);


 // encode the doge20Tx as hex string
 const encodedDoge20Tx = Buffer.from(parsedDoge20Tx).toString('hex');


 for (let i = 0; i < argRepeat; i++) {
   console.log("Minting drc-20 token...", i + 1, "of", argRepeat, "times");
   await mint(argAddress, "text/plain;charset=utf-8", encodedDoge20Tx);
 }
}



function walletNew() {
    // Generate a new private key
    const privateKey = new PrivateKey();
    // Derive the address from the private key
    const address = privateKey.toAddress();

    const json = { privkey: privateKey.toString(), address: address.toString(), utxos: [] };
    
    // Print the private key and address
    console.log('Private Key:', privateKey.toString());
    console.log('Address:', address.toString());
    
    // Return the private key and address
    return json;
}

// Command-line interface
if (require.main === module) {
    const command = process.argv[2];
    if (command === 'wallet' && process.argv[3] === 'new') {
        const result = walletNew();
        console.log(JSON.stringify(result));
    }
}



async function walletSync(walletAddress) {
    console.log('syncing utxos with local Dogecoin node via RPC');

    const body = {
        jsonrpc: "1.0",
        id: "walletsync",
        method: "listunspent",
        params: [0, 9999999, [walletAddress]]  // [minconf, maxconf, [addresses]]
    };

    const options = {
        auth: {
            username: process.env.NODE_RPC_USER,
            password: process.env.NODE_RPC_PASS
        }
    };

    try {
        let response = await axios.post(process.env.NODE_RPC_URL, body, options);
        console.log('RPC Response:', response.data); // Log the entire response

        if (response.data.error) {
            console.error('RPC Error:', response.data.error);
            throw new Error(response.data.error.message);
        }

        let utxos = response.data.result;

        const wallet = {
            address: walletAddress,
            utxos: utxos.map(utxo => ({
                txid: utxo.txid,
                vout: utxo.vout,
                script: utxo.scriptPubKey,
                satoshis: utxo.amount * 1e8 // Convert from DOGE to Satoshis
            }))
        };

        console.log('UTXOs:', JSON.stringify(wallet.utxos, null, 2)); // Print the entire UTXO response

        let balance = wallet.utxos.reduce((acc, curr) => acc + curr.satoshis, 0);

        console.log('balance', balance);
        return wallet; // Return the wallet object
    } catch (error) {
        console.error('Error syncing wallet:', error.response?.data?.error?.message || error.message);
        process.exit(1); // Exit with a non-zero status to indicate an error
    }
}


//eg.usage: node doginals.js send <recipient_address> <amount> '[{"txid": "34ff07e4c9ebc65b8f8b03b514a180df8633297288af78f891033120e4d0145b", "vout": 0, "script": "76a9141dfae158855dc586d1536c900896c4bba78c134188ac", "satoshis": 100000000}, {"txid": "d42cd27113cd7af38d6b213381e59bdeba9333a62d465f7564066442fa8c30b2", "vout": 0, "script": "76a9141dfae158855dc586d1536c900896c4bba78c134188ac", "satoshis": 300000000}]' <private_key>
async function walletSend(argAddress, argAmount, argUtxos, argPrivkey) {
    let balance = argUtxos.reduce((acc, curr) => acc + curr.satoshis, 0);
    if (balance == 0) throw new Error('no funds to send');
 
    let receiver = new Address(argAddress);
    let amount = parseInt(argAmount);
 
    let tx = new Transaction();
    if (amount) {
        tx.to(receiver, amount);
        fund({ utxos: argUtxos, privkey: argPrivkey }, tx);
    } else {
        tx.from(argUtxos);
        tx.change(receiver);
        tx.sign(argPrivkey);
    }
 
    await broadcast(tx, true);
 
    console.log(tx.hash);
 }



// eg. useage: node doginals.js split <number_of_splits> '[{"txid": "d42cd27113cd7af38d6b213381e59bdeba9333a62d465f7564066442fa8c30b2", "vout": 0, "script": "76a9141dfae158855dc586d1536c900896c4bba78c134188ac", "satoshis": 300000000}]' <private_key>
 async function walletSplit(splits, argUtxos, argPrivkey) {
    let balance = argUtxos.reduce((acc, curr) => acc + curr.satoshis, 0);
    if (balance == 0) throw new Error('no funds to split');
 
    let tx = new Transaction();
    tx.from(argUtxos);
    for (let i = 0; i < splits - 1; i++) {
        tx.to(argUtxos[0].script, Math.floor(balance / splits)); // Use the script from the first UTXO
    }
    tx.change(argUtxos[0].script); // Use the script from the first UTXO for change
    tx.sign(argPrivkey);
 
    await broadcast(tx, true);
 
    console.log(tx.hash);
 }



const MAX_SCRIPT_ELEMENT_SIZE = 520

//eg. usage: node doginals.js mint <recipient_address> <content_type_or_filename> <hex_data> '[{"txid": "34ff07e4c9ebc65b8f8b03b514a180df8633297288af78f891033120e4d0145b", "vout": 0, "script": "76a9141dfae158855dc586d1536c900896c4bba78c134188ac", "satoshis": 100000000}]' <private_key>
async function mint(argAddress, argContentTypeOrFilename, argHexData, argUtxos, argPrivkey) {
    const address = new Address(argAddress);
    let contentType;
    let data;

    if (fs.existsSync(argContentTypeOrFilename)) {
        contentType = mime.contentType(mime.lookup(argContentTypeOrFilename));
        data = fs.readFileSync(argContentTypeOrFilename);
    } else {
        contentType = argContentTypeOrFilename;
        if (!/^[a-fA-F0-9]*$/.test(argHexData)) throw new Error('data must be hex');
        data = Buffer.from(argHexData, 'hex');
    }

    if (data.length == 0) {
        throw new Error('no data to mint');
    }

    if (contentType.length > MAX_SCRIPT_ELEMENT_SIZE) {
        throw new Error('content type too long');
    }

    const wallet = {
        address: argAddress,
        utxos: argUtxos,
        privkey: argPrivkey
    };

    let txs = inscribe(wallet, address, contentType, data);

    // Convert transactions to hex and print them
    const txHexes = txs.map(tx => tx.toString());
    console.log('Transaction Hexes:', JSON.stringify(txHexes, null, 2));

    return txHexes; // Return the list of transaction hexes
}

async function walletBroadcastRaw(rawTxHex) {
    const body = {
        jsonrpc: "1.0",
        id: 0,
        method: "sendrawtransaction",
        params: [rawTxHex]
    };

    const options = {
        auth: {
            username: process.env.NODE_RPC_USER,
            password: process.env.NODE_RPC_PASS
        }
    };

    try {
        const response = await axios.post(process.env.NODE_RPC_URL, body, options);
        const txid = response.data.result;
        console.log('Transaction ID:', txid);
        return txid; // Return the transaction ID
    } catch (e) {
        console.error('Broadcast failed:', e?.response?.data?.error?.message || e.message);
        throw e;
    }
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
const ORD_TX_AMOUNT = 100000

function inscribe(wallet, address, contentType, data) {
    let txs = []


    let privateKey = new PrivateKey(wallet.privkey)
    let publicKey = privateKey.toPublicKey()

    let parts = []
    while (data.length) {
        let part = data.slice(0, Math.min(MAX_CHUNK_LEN, data.length))
        data = data.slice(part.length)
        parts.push(part)
    }


    let inscription = new Script()
    inscription.chunks.push(bufferToChunk('ord'))
    inscription.chunks.push(numberToChunk(parts.length))
    inscription.chunks.push(bufferToChunk(contentType))
    parts.forEach((part, n) => {
        inscription.chunks.push(numberToChunk(parts.length - n - 1))
        inscription.chunks.push(bufferToChunk(part))
    })



    let p2shInput
    let lastLock
    let lastPartial

    while (inscription.chunks.length) {
        let partial = new Script()

        if (txs.length == 0) {
            partial.chunks.push(inscription.chunks.shift())
        }

        while (partial.toBuffer().length <= MAX_PAYLOAD_LEN && inscription.chunks.length) {
            partial.chunks.push(inscription.chunks.shift())
            partial.chunks.push(inscription.chunks.shift())
        }

        if (partial.toBuffer().length > MAX_PAYLOAD_LEN) {
            inscription.chunks.unshift(partial.chunks.pop())
            inscription.chunks.unshift(partial.chunks.pop())
        }

        let lock = new Script()
        lock.chunks.push(bufferToChunk(publicKey.toBuffer()))
        lock.chunks.push(opcodeToChunk(Opcode.OP_CHECKSIGVERIFY))
        partial.chunks.forEach(() => {
            lock.chunks.push(opcodeToChunk(Opcode.OP_DROP))
        })
        lock.chunks.push(opcodeToChunk(Opcode.OP_TRUE))

        let lockhash = Hash.ripemd160(Hash.sha256(lock.toBuffer()))

        let p2sh = new Script()
        p2sh.chunks.push(opcodeToChunk(Opcode.OP_HASH160))
        p2sh.chunks.push(bufferToChunk(lockhash))
        p2sh.chunks.push(opcodeToChunk(Opcode.OP_EQUAL))

        let p2shOutput = new Transaction.Output({
            script: p2sh,
            satoshis: ORD_TX_AMOUNT
        })

        let tx = new Transaction()
        if (p2shInput) tx.addInput(p2shInput)
        tx.addOutput(p2shOutput)
        fund(wallet, tx)

        if (p2shInput) {
            let signature = Transaction.sighash.sign(tx, privateKey, Signature.SIGHASH_ALL, 0, lastLock)
            let txsignature = Buffer.concat([signature.toBuffer(), Buffer.from([Signature.SIGHASH_ALL])])

            let unlock = new Script()
            unlock.chunks = unlock.chunks.concat(lastPartial.chunks)
            unlock.chunks.push(bufferToChunk(txsignature))
            unlock.chunks.push(bufferToChunk(lastLock.toBuffer()))
            tx.inputs[0].setScript(unlock)
        }

        updateWallet(wallet, tx)
        txs.push(tx)

        p2shInput = new Transaction.Input({
            prevTxId: tx.hash,
            outputIndex: 0,
            output: tx.outputs[0],
            script: ''
        })

        p2shInput.clearSignatures = () => {}
        p2shInput.getSignatures = () => {}


        lastLock = lock
        lastPartial = partial
    }

    let tx = new Transaction()
    tx.addInput(p2shInput)
    tx.to(address, ORD_TX_AMOUNT)
    fund(wallet, tx)

    let signature = Transaction.sighash.sign(tx, privateKey, Signature.SIGHASH_ALL, 0, lastLock)
    let txsignature = Buffer.concat([signature.toBuffer(), Buffer.from([Signature.SIGHASH_ALL])])

    let unlock = new Script()
    unlock.chunks = unlock.chunks.concat(lastPartial.chunks)
    unlock.chunks.push(bufferToChunk(txsignature))
    unlock.chunks.push(bufferToChunk(lastLock.toBuffer()))
    tx.inputs[0].setScript(unlock)

    updateWallet(wallet, tx)
    txs.push(tx)

    return txs
}


function fund(wallet, tx) {
    tx.change(wallet.address)
    delete tx._fee

    for (const utxo of wallet.utxos) {
        if (tx.inputs.length && tx.outputs.length && tx.inputAmount >= tx.outputAmount + tx.getFee()) {
            break
        }

        delete tx._fee
        tx.from(utxo)
        tx.change(wallet.address)
        tx.sign(wallet.privkey)
    }

    if (tx.inputAmount < tx.outputAmount + tx.getFee()) {
        throw new Error('not enough funds')
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


async function extract(txid) {
    const body = {
        jsonrpc: "1.0",
        id: "extract",
        method: "getrawtransaction",
        params: [txid, true] // [txid, verbose=true]
    }

    const options = {
        auth: {
            username: process.env.NODE_RPC_USER,
            password: process.env.NODE_RPC_PASS
        }
    }

    let response = await axios.post(process.env.NODE_RPC_URL, body, options)
    let transaction = response.data.result

    let inputs = transaction.vin
    let scriptHex = inputs[0].scriptSig.hex
    let script = Script.fromHex(scriptHex)
    let chunks = script.chunks

    let prefix = chunks.shift().buf.toString('utf-8')
    if (prefix != 'ord') {
        throw new Error('not a doginal')
    }

    let pieces = chunkToNumber(chunks.shift())

    let contentType = chunks.shift().buf.toString('utf-8')

    let data = Buffer.alloc(0)
    let remaining = pieces

    while (remaining && chunks.length) {
        let n = chunkToNumber(chunks.shift())

        if (n !== remaining - 1) {
            txid = transaction.vout[0].spent.hash
            response = await axios.post(process.env.NODE_RPC_URL, body, options)
            transaction = response.data.result
            inputs = transaction.vin
            scriptHex = inputs[0].scriptSig.hex
            script = Script.fromHex(scriptHex)
            chunks = script.chunks
            continue
        }

        data = Buffer.concat([data, chunks.shift().buf])
        remaining -= 1
    }

    return {
        contentType,
        data
    }
}


main().catch(e => {
    let reason = e.response && e.response.data && e.response.data.error && e.response.data.error.message
    console.error(reason ? e.message + ':' + reason : e.message)
})

// Export the main function for use in Python
module.exports = { main };
