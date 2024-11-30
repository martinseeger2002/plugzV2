#!/usr/bin/env python3


from decimal import Decimal
import requests
from ecdsa import SigningKey, SECP256k1, util
import hashlib
import struct
import base58

api_key = None

def varint(n):
    if n < 0xfd:
        return struct.pack('<B', n)
    elif n <= 0xffff:
        return b'\xfd' + struct.pack('<H', n)
    elif n <= 0xffffffff:
        return b'\xfe' + struct.pack('<I', n)
    else:
        return b'\xff' + struct.pack('<Q', n)

def get_utxos(address, api_key):
    """
    Retrieve UTXOs for the given address using the API.
    """
    url = f"https://blockchainplugz.com/api/v1/get_tx_unspent/LKY/{address}"
    headers = {
        "X-API-Key": api_key
    }
    utxos = []

    try:
        response = requests.get(url, headers=headers)
        response_data = response.json()
        if response_data['status'] == 'success':
            for utxo in response_data['data']['txs']:
                utxo_info = {
                    'transaction_hash': utxo['txid'],
                    'index': utxo['output_no'],
                    'value': int(Decimal(str(utxo['value'])) * Decimal('1e8')),  # Convert LKY to satoshis
                    'scriptPubKey': utxo['script_hex'],
                }
                utxos.append(utxo_info)
                # print(f"UTXO: {utxo_info}")  # Print UTXO details
        else:
            # print(f"An error occurred: {response_data['message']}")
            pass
    except requests.exceptions.RequestException as e:
        # print(f"An error occurred: {str(e)}")
        pass

    return utxos

def create_script_pubkey(address):
    # Decode the address (assuming it's a base58check encoded address)
    address_bytes = base58.b58decode_check(address)
    # The first byte is the version, the rest is the pubkey hash
    pubkey_hash = address_bytes[1:]
    # Build the scriptPubKey
    script_pubkey = (
        b'\x76' +  # OP_DUP
        b'\xa9' +  # OP_HASH160
        bytes([len(pubkey_hash)]) +
        pubkey_hash +
        b'\x88' +  # OP_EQUALVERIFY
        b'\xac'    # OP_CHECKSIG
    )
    return script_pubkey.hex()

def create_raw_transaction(utxos, from_address, to_address, amount_satoshis, fee_satoshis, dev_fee_satoshis, dev_fee_address):
    inputs = []
    outputs = {}
    total_input = 0

    # Select UTXOs to cover the amount + fees + dev fee (if applicable)
    total_needed = amount_satoshis + dev_fee_satoshis + fee_satoshis

    # Select UTXOs to cover the total amount needed
    for utxo in utxos:
        inputs.append({
            'txid': utxo['transaction_hash'],
            'vout': utxo['index'],
            'scriptPubKey': utxo['scriptPubKey'],
            'value': utxo['value'],
        })
        total_input += utxo['value']
        # print(f"Selected UTXO: {utxo}")  # Print the UTXO being used
        # print(f"Running total: {total_input} litoshis")
        if total_input >= total_needed:
            break

    if total_input < total_needed:
        # print(f"Insufficient funds. Total input: {total_input}, Total needed: {total_needed}")
        raise Exception("Insufficient funds")

    # Outputs
    # vout 0: Recipient output
    outputs[to_address] = amount_satoshis
    # print(f"Output to recipient: {to_address}, Amount: {amount_satoshis} litoshis")

    # vout 1: Dev fee output (if any)
    if dev_fee_satoshis > 0:
        outputs[dev_fee_address] = dev_fee_satoshis
        # print(f"Output to dev fee address: {dev_fee_address}, Amount: {dev_fee_satoshis} litoshis")

    # Change output (if any)
    change_satoshis = total_input - total_needed
    if change_satoshis > 0:
        outputs[from_address] = change_satoshis

    tx = {
        'version': 2,
        'locktime': 0,
        'inputs': inputs,
        'outputs': outputs,
    }

    return tx

def serialize_transaction(tx, for_signing=False, input_index=None, script_code=None):
    # Start with the version
    result = struct.pack("<I", tx['version'])  # version

    # Serialize inputs
    result += varint(len(tx['inputs']))  # Number of inputs

    for i, txin in enumerate(tx['inputs']):
        result += bytes.fromhex(txin['txid'])[::-1]  # txid (little-endian)
        result += struct.pack("<I", txin['vout'])  # vout

        if for_signing:
            if i == input_index:
                # Use script_code for the input being signed
                script_sig = bytes.fromhex(script_code)
                result += varint(len(script_sig)) + script_sig
            else:
                # Empty scriptSig
                result += varint(0)
        else:
            # Include scriptSig
            script_sig = bytes.fromhex(txin.get('scriptSig', ''))
            result += varint(len(script_sig)) + script_sig

        result += struct.pack("<I", 0xffffffff)  # sequence

    # Serialize outputs
    result += varint(len(tx['outputs']))  # Number of outputs
    for address, amount in tx['outputs'].items():
        result += struct.pack("<Q", amount)  # amount in satoshis
        script_pubkey = bytes.fromhex(create_script_pubkey(address))
        result += varint(len(script_pubkey)) + script_pubkey

    # Locktime
    result += struct.pack("<I", tx['locktime'])  # locktime

    return result

def sign_transaction(tx, privkey_hex):
    # Get the private key in bytes
    privkey_bytes = bytes.fromhex(privkey_hex)
    privkey = SigningKey.from_string(privkey_bytes, curve=SECP256k1)
    vk = privkey.get_verifying_key()
    public_key_bytes = vk.to_string("compressed")  # Compressed public key

    # Sign each input
    for index, txin in enumerate(tx['inputs']):
        # Get the scriptPubKey of the UTXO being spent
        script_pubkey = txin['scriptPubKey']
        # For P2PKH, the script code is the scriptPubKey
        script_code = script_pubkey
        # Create the serialization of the transaction for signing
        tx_serialized = serialize_transaction(tx, for_signing=True, input_index=index, script_code=script_code)
        # Append SIGHASH_ALL
        tx_serialized += struct.pack("<I", 1)  # SIGHASH_ALL

        # Compute the double SHA256 hash
        message_hash = hashlib.sha256(hashlib.sha256(tx_serialized).digest()).digest()

        # Sign the hash
        signature = privkey.sign_digest(message_hash, sigencode=util.sigencode_der_canonize)
        signature += b'\x01'  # Append SIGHASH_ALL

        # Build the scriptSig
        script_sig = (
            varint(len(signature)) + signature +
            varint(len(public_key_bytes)) + public_key_bytes
        )

        # Update the transaction input's scriptSig
        txin['scriptSig'] = script_sig.hex()

    return tx

def broadcast_transaction(raw_tx_hex, api_key):
    """
    Broadcast the transaction to the network via the API.
    """
    url = "https://blockchainplugz.com/api/v1/send_tx/LKY"  # Updated URL
    headers = {
        "X-API-Key": api_key,
        "Content-Type": "application/json"
    }
    payload = {
        "tx_hex": raw_tx_hex  # Updated payload key
    }

    try:
        response = requests.post(url, headers=headers, json=payload)
        response_data = response.json()
        if response_data['status'] == 'success':
            txid = response_data['data']['txid']
            return txid
        else:
            return None
    except requests.exceptions.RequestException as e:
        return None

def public_key_to_address(public_key_bytes):
    # Perform SHA256 hashing on the public key
    sha256 = hashlib.sha256(public_key_bytes).digest()
    # Perform RIPEMD-160 hashing on the result
    ripemd160 = hashlib.new('ripemd160', sha256).digest()
    # Add version byte (0x2F for Luckycoin mainnet)
    versioned_payload = b'\x2F' + ripemd160
    # Perform double SHA256 hashing on the versioned payload
    checksum = hashlib.sha256(hashlib.sha256(versioned_payload).digest()).digest()[:4]
    # Concatenate versioned payload and checksum
    address_bytes = versioned_payload + checksum
    # Convert to Base58Check format
    return base58.b58encode(address_bytes).decode('utf-8')

def send_lucky(from_address, privkey_wif, api_key, recipient_address, amount_to_send, dev_fee_base, dev_fee_address="<dev fee address>"):


    # Convert WIF to hex
    privkey_hex = wif_to_hex_private_key(privkey_wif)

    # Verify the derived address matches the expected address
    privkey_bytes = bytes.fromhex(privkey_hex)
    privkey = SigningKey.from_string(privkey_bytes, curve=SECP256k1)
    vk = privkey.get_verifying_key()
    public_key_bytes = vk.to_string("compressed")

    derived_address = public_key_to_address(public_key_bytes)

    if derived_address != from_address:
        return None

    amount_satoshis = int(amount_to_send * 1e8)
    base_fee_lucky = 0.0225

    utxos = get_utxos(from_address, api_key)

    num_inputs = len(utxos)
    fee_lucky = base_fee_lucky * num_inputs
    fee_satoshis = int(fee_lucky * 1e8)

    dev_fee_satoshis = int(dev_fee_base * 1e8 * 0.01)

    tx = create_raw_transaction(utxos, from_address, recipient_address, amount_satoshis, fee_satoshis, dev_fee_satoshis, dev_fee_address)

    tx_signed = sign_transaction(tx, privkey_hex)

    raw_tx = serialize_transaction(tx_signed)
    raw_tx_hex = raw_tx.hex()

    return broadcast_transaction(raw_tx_hex, api_key)

def wif_to_hex_private_key(wif):
    # Decode the WIF key
    decoded = base58.b58decode(wif)
    
    # Remove the version byte (first byte) and checksum (last 4 bytes)
    private_key_with_compression_flag = decoded[1:-4]
    
    # Check if it's a compressed private key (33 bytes instead of 32)
    if len(private_key_with_compression_flag) == 33:
        private_key = private_key_with_compression_flag[:-1]  # Remove the compression flag
    else:
        private_key = private_key_with_compression_flag
    
    # Convert to hexadecimal
    hex_private_key = private_key.hex()
    
    return hex_private_key

# Example usage (to be removed or commented out in the module)
if __name__ == "__main__":
    # Example usage
    from_address = "<senders address>"
    privkey_wif = "<senders wif>"
    api_key = "lucky1"
    recipient_address = "<recievers address>"
    amount_to_send = 1.1  # Amount in Luckycoin
    dev_fee_base = 0.0  # the amount that de
    dev_fee_address = "<dev fee address>"

    try:
        txid = send_lucky(from_address, privkey_wif, api_key, recipient_address, amount_to_send, dev_fee_base, dev_fee_address)
        if txid:
            print(txid)  # Print only the transaction ID
        else:
            print("Transaction failed")
    except Exception as e:
        print(f"Exception occurred: {str(e)}")
