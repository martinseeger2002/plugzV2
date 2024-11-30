const dogecore = require('./bitcore-lib-luckycoin');
const { PrivateKey, Transaction } = dogecore;

/**
 * Converts Bitcoin (BTC) to Satoshis (sats).
 * @param {number|string} btc - The amount in BTC.
 * @returns {number} The equivalent amount in satoshis.
 */
function btcToSatoshis(btc) {
  return Math.round(parseFloat(btc) * 1e8);
}

/**
 * Converts Satoshis (sats) to Bitcoin (BTC).
 * @param {number|string} sats - The amount in satoshis.
 * @returns {number} The equivalent amount in BTC.
 */
function satoshisToBtc(sats) {
  return parseFloat(sats) / 1e8;
}

/**
 * Validates the input parameters for sending a transaction.
 * @param {object} params - The transaction parameters.
 * @throws Will throw an error if validation fails.
 */
function validateInputs(params) {
  const {
    sendingAddress,
    wifPrivateKey,
    utxos,
    recipients,
    fee,
    changeAddress
  } = params;

  if (!sendingAddress || typeof sendingAddress !== 'string') {
    throw new Error('Invalid sending address.');
  }

  if (!wifPrivateKey || typeof wifPrivateKey !== 'string') {
    throw new Error('Invalid WIF private key.');
  }

  if (!Array.isArray(utxos) || utxos.length === 0) {
    throw new Error('UTXOs must be a non-empty array.');
  }

  utxos.forEach((utxo, index) => {
    if (
      !utxo.txId ||
      typeof utxo.txId !== 'string' ||
      isNaN(parseInt(utxo.vout, 10)) ||
      isNaN(parseInt(utxo.amount, 10)) ||
      !utxo.scriptPubKey ||
      typeof utxo.scriptPubKey !== 'string'
    ) {
      throw new Error(`Invalid UTXO at index ${index}.`);
    }
  });

  if (!Array.isArray(recipients) || recipients.length === 0) {
    throw new Error('Recipients must be a non-empty array.');
  }

  recipients.forEach((recipient, index) => {
    if (
      !recipient.address ||
      typeof recipient.address !== 'string' ||
      isNaN(parseInt(recipient.amount, 10)) ||
      parseInt(recipient.amount, 10) <= 0
    ) {
      throw new Error(`Invalid recipient at index ${index}.`);
    }
  });

  if (isNaN(parseInt(fee, 10)) || parseInt(fee, 10) <= 0) {
    throw new Error('Invalid fee amount.');
  }

  if (!changeAddress || typeof changeAddress !== 'string') {
    throw new Error('Invalid change address.');
  }
}

/**
 * Sends a Bitcoin transaction.
 *
 * @param {string} sendingAddress - The address sending the funds.
 * @param {string} wifPrivateKey - The WIF-formatted private key.
 * @param {Array} utxos - List of UTXOs, each with txId, vout, amount, and scriptPubKey.
 * @param {Array} recipients - List of recipients, each with address and amount.
 * @param {number} fee - Transaction fee in satoshis.
 * @param {string} changeAddress - Address to receive the change.
 * @returns {Promise<string>} Transaction Hex.
 */
async function sendBitcoinTransaction(sendingAddress, wifPrivateKey, utxos, recipients, fee, changeAddress) {
  try {
    // Validate inputs
    validateInputs({ sendingAddress, wifPrivateKey, utxos, recipients, fee, changeAddress });

    // Format UTXOs
    const formattedUtxos = utxos.map(utxo => ({
      txId: utxo.txId,
      outputIndex: parseInt(utxo.vout, 10),
      address: sendingAddress,
      script: utxo.scriptPubKey,
      satoshis: parseInt(utxo.amount, 10)
    }));
    console.log('Formatted UTXOs:', formattedUtxos);

    // Initialize private key
    let privateKey;
    try {
      privateKey = PrivateKey.fromWIF(wifPrivateKey);
      console.log('Private key initialized successfully.');
    } catch (err) {
      console.error('Failed to parse WIF private key:', err.message);
      throw new Error('Failed to parse WIF private key.');
    }

    // Create a new transaction and add UTXOs
    let transaction = new Transaction();
    formattedUtxos.forEach(utxo => {
      transaction = transaction.from({
        txId: utxo.txId,
        outputIndex: utxo.outputIndex,
        script: utxo.script,
        satoshis: utxo.satoshis
      });
    });
    console.log('Transaction after adding UTXOs:', transaction);

    // Add recipients
    recipients.forEach(recipient => {
      transaction = transaction.to(recipient.address, parseInt(recipient.amount, 10));
    });
    console.log('Transaction after adding recipients:', transaction);

    // Set fee
    transaction = transaction.fee(parseInt(fee, 10));
    console.log('Transaction after setting fee:', transaction);

    // Set change address
    transaction = transaction.change(changeAddress);
    console.log('Transaction after setting change address:', transaction);

    // Sign the transaction
    transaction = transaction.sign(privateKey);
    console.log('Signed transaction:', transaction);

    // Serialize and return transaction hex
    const txHex = transaction.serialize();
    console.log('Serialized transaction hex:', txHex);
    return txHex;

  } catch (error) {
    console.error('Error sending Bitcoin transaction:', error.message);
    throw error; // Re-throw the error after logging
  }
}

module.exports = sendBitcoinTransaction;
