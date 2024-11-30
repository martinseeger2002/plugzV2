import json
from bitcoinrpc.authproxy import AuthServiceProxy, JSONRPCException
import configparser
from decimal import Decimal
import binascii
import hashlib
from Crypto.Hash import RIPEMD160
import base58

# Load RPC credentials from RPC2.conf
def load_rpc_credentials(ticker):
    config = configparser.ConfigParser()
    config.read('../config/RPC2.conf')
    creds = {
        'rpc_user': config[ticker]['rpcuser'],
        'rpc_password': config[ticker]['rpcpassword'],
        'rpc_host': config[ticker]['rpchost'],
        'rpc_port': config[ticker]['rpcport']
    }
    return creds

# Connect to the RPC server
def connect_rpc(ticker):
    creds = load_rpc_credentials(ticker)
    rpc_url = f"http://{creds['rpc_user']}:{creds['rpc_password']}@{creds['rpc_host']}:{creds['rpc_port']}"
    return AuthServiceProxy(rpc_url)

# Decode the script hex to get the public key
def decode_script_hex(script_hex):
    script_bytes = binascii.unhexlify(script_hex)
    pubkey = script_bytes[-33:] if len(script_bytes) > 33 else script_bytes[-65:]
    return pubkey

# Convert the public key to an address
def pubkey_to_address(pubkey, network='mainnet', coin='bitcoin'):
    # Perform SHA-256 hashing on the public key
    sha256 = hashlib.sha256(pubkey).digest()
    # Perform RIPEMD-160 hashing using pycryptodome
    ripemd160 = RIPEMD160.new(sha256).digest()
    
    # Determine the network byte based on the coin type
    if coin == 'doge':
        network_byte = b'\x1e' if network == 'mainnet' else b'\x71'
    elif coin == 'ltc' or coin == 'lky':
        network_byte = b'\x30' if network == 'mainnet' else b'\x6f'
    else:
        raise ValueError("Unsupported coin type")
    
    hashed_pubkey = network_byte + ripemd160
    # Perform double SHA-256 hashing on the extended RIPEMD-160 result
    checksum = hashlib.sha256(hashlib.sha256(hashed_pubkey).digest()).digest()[:4]
    # Append the checksum to the extended RIPEMD-160 hash
    binary_address = hashed_pubkey + checksum
    # Convert the binary address to Base58
    address = base58.b58encode(binary_address).decode('utf-8')
    return address

# Get the sending address from a transaction
def get_sending_address(rpc_connection, txid, coin):
    try:
        raw_tx = rpc_connection.getrawtransaction(txid)
        decoded_tx = rpc_connection.decoderawtransaction(raw_tx)
        if 'vin' in decoded_tx and len(decoded_tx['vin']) > 0:
            vin = decoded_tx['vin'][0]
            if 'scriptSig' in vin and 'hex' in vin['scriptSig']:
                script_hex = vin['scriptSig']['hex']
                pubkey = decode_script_hex(script_hex)
                return pubkey_to_address(pubkey, coin=coin)
        return 'unknown'
    except JSONRPCException as e:
        print(f"Error fetching transaction details for {txid}: {e}")
        return 'unknown'

# Load existing wallet data from JSON
def load_existing_wallet_data(file_path):
    try:
        with open(file_path, 'r') as json_file:
            return json.load(json_file)
    except (FileNotFoundError, json.JSONDecodeError):
        return {}

# Get UTXOs for a specific wallet address
def get_utxos_for_address(rpc_connection, wallet_address, coin, existing_utxos):
    try:
        all_utxos = rpc_connection.listunspent()
        utxos_with_sending_address = []
        total_balance = Decimal(0)
        existing_txids = {utxo['txid'] for utxo in existing_utxos}

        for utxo in all_utxos:
            if utxo['address'] == wallet_address and utxo['txid'] not in existing_txids:
                sending_address = get_sending_address(rpc_connection, utxo['txid'], coin)
                filtered_utxo = {
                    'txid': utxo['txid'],
                    'address': utxo['address'],
                    'amount': utxo['amount'],
                    'sending_address': sending_address,
                    'credits_paid': None
                }
                utxos_with_sending_address.append(filtered_utxo)
                total_balance += Decimal(utxo['amount'])

        # Add existing UTXOs to the list
        utxos_with_sending_address.extend(existing_utxos)
        total_balance += sum(Decimal(utxo['amount']) for utxo in existing_utxos)

        return utxos_with_sending_address, total_balance
    except JSONRPCException as e:
        print(f"Error fetching UTXOs: {e}")
        return existing_utxos, Decimal(0)

# Convert Decimal to float for JSON serialization
def convert_decimal_to_float(data):
    if isinstance(data, list):
        return [convert_decimal_to_float(item) for item in data]
    elif isinstance(data, dict):
        return {key: convert_decimal_to_float(value) for key, value in data.items()}
    elif isinstance(data, Decimal):
        return float(data)
    else:
        return data

# Main function to check UTXOs and save to JSON
def check_utxos_and_save():
    file_path = '../db/creditsWallet.json'
    existing_wallet_data = load_existing_wallet_data(file_path)

    tickers = {
        'LKY': 'L6fDpwqUHYLEjrSEr98rGBz9w9dYHwxjaF',
        'DOGE': 'DKpHXgYLdi5XiwL9e1D9tXzBSTpTHnBLYA',
    }
    wallet_data = {}

    for ticker, wallet_address in tickers.items():
        rpc_connection = connect_rpc(ticker)
        existing_utxos = existing_wallet_data.get(ticker, {}).get('utxos', [])
        utxos, balance = get_utxos_for_address(rpc_connection, wallet_address, coin=ticker.lower(), existing_utxos=existing_utxos)
        wallet_data[ticker] = {
            'wallet_address': wallet_address,
            'balance': float(balance),
            'utxos': convert_decimal_to_float(utxos)
        }

    # Save the data to a JSON file
    with open(file_path, 'w') as json_file:
        json.dump(wallet_data, json_file, indent=4)

if __name__ == '__main__':
    check_utxos_and_save()