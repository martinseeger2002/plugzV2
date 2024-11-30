import json
import base64
import binascii
import sqlite3
from bitcoinrpc.authproxy import AuthServiceProxy, JSONRPCException
from bs4 import BeautifulSoup
import time
import configparser
import os
import re
from decimal import Decimal

# Connect to Bitcoin RPC
rpc_user = "your_rpc_username"
rpc_password = "your_rpc_password"
rpc_host = "localhost"
rpc_port = "33874"  # Default port for Dogecoin
rpc_url = f"http://{rpc_user}:{rpc_password}@{rpc_host}:{rpc_port}"

# Function to establish a connection to the Bitcoin RPC server
def connect_to_rpc():
    try:
        return AuthServiceProxy(rpc_url, timeout=60)
    except Exception as e:
        print(f"Error connecting to RPC server: {e}")
        return None

# Load last scanned block height
def load_last_block_height():
    try:
        with open('./last_block_scaned.json', 'r') as f:
            return json.load(f).get('last_block_height', 0)
    except FileNotFoundError:
        return 0

# Function to update last scanned block height
def update_last_block_height(block_height):
    with open('./last_block_scaned.json', 'w') as f:
        json.dump({'last_block_height': block_height}, f)

# Function to decode hex to base64
def hex_to_base64(hex_str):
    try:
        if len(hex_str) % 2 != 0:
            print("Odd-length hex string detected. Skipping transaction.")
            return None
        return base64.b64encode(binascii.unhexlify(hex_str)).decode('utf-8')
    except binascii.Error as e:
        print(f"Error decoding hex to base64: {e}")
        return None

# Function to decode base64 to text
def base64_to_text(base64_str):
    try:
        return base64.b64decode(base64_str).decode('utf-8')
    except (binascii.Error, UnicodeDecodeError) as e:
        print(f"Error decoding base64 to text: {e}")
        return None

# Function to convert hex to ASCII
def hex_to_ascii(hex_string):
    try:
        if len(hex_string) % 2 != 0:
            print("Odd-length hex string detected. Skipping transaction.")
            return None
        return binascii.unhexlify(hex_string).decode('ascii')
    except Exception as e:
        print(f"Error converting hex to ASCII: {e}")
        return None

# Function to check if sn is valid
def is_valid_sn(sn, collection_name):
    # Load the configuration file
    config = configparser.ConfigParser()
    config_path = f'./tokens/{collection_name}.conf'
    if not os.path.exists(config_path):
        print(f"Configuration file {config_path} does not exist.")
        return False
    config.read(config_path)
    
    # Check if the entire sn is within a single range
    if 'sn_range' in config['DEFAULT']:
        valid_range = config['DEFAULT']['sn_range'].split('-')
        if len(valid_range[0]) > 2 and len(valid_range[1]) > 2:
            if valid_range[0] <= sn.zfill(len(valid_range[1])) <= valid_range[1]:
                print(f"Serial number {sn} is within the single range {valid_range}.")
                return True
            else:
                print(f"Serial number {sn} is not within the single range {valid_range}.")
                return False

    # Check if there is only one sn_index key
    sn_index_keys = [key for key in config['DEFAULT'] if key.startswith('sn_index_')]
    if len(sn_index_keys) == 1:
        valid_range = config['DEFAULT'][sn_index_keys[0]].split('-')
        if valid_range[0] <= sn.zfill(len(valid_range[1])) <= valid_range[1]:
            print(f"Serial number {sn} is within the single range {valid_range}.")
            return True
        else:
            print(f"Serial number {sn} is not within the single range {valid_range}.")
            return False

    # Check segmented ranges
    segments = [sn[i:i+2] for i in range(0, len(sn), 2)]
    for i, segment in enumerate(segments):
        range_key = f'sn_index_{i}'
        if range_key in config['DEFAULT']:
            valid_range = config['DEFAULT'][range_key].split('-')
            padded_segment = segment.zfill(len(valid_range[1]))
            if valid_range[0] <= padded_segment <= valid_range[1]:
                print(f"Segment {padded_segment} of serial number {sn} is within range {valid_range}.")
            else:
                print(f"Segment {padded_segment} of serial number {sn} is not within range {valid_range}.")
                return False
        else:
            print(f"Range key {range_key} not found in configuration.")
            return False
    return True

# Function to sanitize the collection name
def sanitize_filename(name):
    # Remove any character that is not alphanumeric, underscore, or hyphen
    return re.sub(r'[^\w\-]', '', name)

# Function to process transactions
def process_transaction(tx, rpc_connection):
    txid = tx['txid']

    # Check if there is at least one vin
    if not tx.get('vin'):
        return

    vin = tx['vin'][0]

    # Check if 'scriptSig' and 'asm' are present in vin[0]
    if 'scriptSig' in vin and 'asm' in vin['scriptSig']:
        asm_data = vin['scriptSig']['asm'].split()
        # Check if '6582895' is the first opcode
        if asm_data and asm_data[0] == '6582895':
            # Proceed to extract inscription data
            data_string, mime_type = extract_inscription_data(asm_data)
            if not data_string or not mime_type or 'text/plain' not in mime_type.lower():
                return  # Skip if no data or MIME type does not contain 'text/plain'

            # Decode and process the JSON data
            json_data_text = hex_to_ascii(data_string)
            if not json_data_text:
                print(f"Empty or invalid JSON data in transaction {txid}.")
                return

            # Print the JSON data for debugging
            print(f"JSON data in transaction {txid}: {json_data_text}")

            # Check if the data is valid JSON
            if not json_data_text.startswith('{') or not json_data_text.endswith('}'):
                print(f"Non-JSON data in transaction {txid}: {json_data_text}")
                return

            try:
                json_data = json.loads(json_data_text)
                if json_data.get('p') == 'prc-20':
                    if json_data.get('op') == 'deploy':
                        handle_deploy_operation(json_data, txid, tx)
                    elif json_data.get('op') == 'mint':
                        handle_mint_operation(json_data, txid, tx)
            except json.JSONDecodeError as e:
                print(f"Error parsing JSON in transaction {txid}: {e}")
                return
    else:
        return  # 'scriptSig' or 'asm' not in vin[0], skip transaction

def extract_inscription_data(asm_data):
    data_string = ""
    mime_type = None
    index = 1  # Start after '6582895'

    if index >= len(asm_data):
        return None, None

    # Process genesis transaction
    num_chunks = asm_data[index]
    if not num_chunks.lstrip('-').isdigit():
        return None, None
    index += 1

    if index >= len(asm_data):
        return None, None

    mime_type_hex = asm_data[index]
    mime_type = hex_to_ascii(mime_type_hex)
    index += 1

    while index < len(asm_data):
        part = asm_data[index]
        if part.lstrip('-').isdigit():
            # Number of chunks
            index += 1
            if index >= len(asm_data):
                return None, None
            data_chunk = asm_data[index]
            data_string += data_chunk
            index += 1
        else:
            break

    return data_string, mime_type

def handle_deploy_operation(json_data, txid, tx):
    # Extract token details
    tick = json_data.get('tick', 'Untitled').lower()
    max_supply = int(json_data.get('max', '0'))
    limit = int(json_data.get('lim', '0'))

    # Get inscription address from vout[0]
    inscription_address = None
    if tx['vout']:
        vout0 = tx['vout'][0]
        if 'scriptPubKey' in vout0 and 'addresses' in vout0['scriptPubKey']:
            inscription_address = vout0['scriptPubKey']['addresses'][0]

    # Ensure the directory exists
    db_directory = './tokens'
    if not os.path.exists(db_directory):
        os.makedirs(db_directory)

    # Initialize the database for the token
    db_path = os.path.join(db_directory, f'{tick}.db')
    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS tokens (
            token_id INTEGER PRIMARY KEY AUTOINCREMENT,
            tick TEXT UNIQUE,
            deploy_txid TEXT UNIQUE,
            deploy_address TEXT,
            max_supply INTEGER NOT NULL,
            limit_per_mint INTEGER NOT NULL,
            current_supply INTEGER DEFAULT 0 CHECK (current_supply >= 0 AND current_supply <= max_supply)
        )
    ''')
    c.execute('INSERT OR IGNORE INTO tokens (tick, deploy_txid, deploy_address, max_supply, limit_per_mint) VALUES (?, ?, ?, ?, ?)',
              (tick, txid, inscription_address, max_supply, limit))
    conn.commit()
    conn.close()
    print(f"Token {tick} deployed and saved to database at {db_path}")

def handle_mint_operation(json_data, txid, tx):
    # Extract mint details
    tick = json_data.get('tick', 'Untitled').lower()  # Convert to lowercase
    amount = int(json_data.get('amt', '0'))

    # Initialize the database path for the token
    db_path = f'./tokens/{tick}.db'

    # Check if the database exists
    if not os.path.exists(db_path):
        print(f"No deployment found for token {tick}. Mint operation is invalid.")
        return

    conn = sqlite3.connect(db_path)
    c = conn.cursor()

    # Ensure the tokens table exists
    c.execute('''
        CREATE TABLE IF NOT EXISTS tokens (
            token_id INTEGER PRIMARY KEY AUTOINCREMENT,
            tick TEXT UNIQUE,
            deploy_txid TEXT UNIQUE,
            deploy_address TEXT,
            max_supply INTEGER NOT NULL,
            limit_per_mint INTEGER NOT NULL,
            current_supply INTEGER DEFAULT 0 CHECK (current_supply >= 0 AND current_supply <= max_supply)
        )
    ''')

    # Fetch current supply and limits
    c.execute('SELECT max_supply, limit_per_mint, current_supply FROM tokens WHERE tick = ?', (tick,))
    token_info = c.fetchone()

    if not token_info:
        print(f"No deployment found for token {tick}. Mint operation is invalid.")
        conn.close()
        return

    max_supply, limit_per_mint, current_supply = token_info

    # Check if the mint amount is valid
    if amount > limit_per_mint:
        print(f"Mint amount {amount} exceeds the limit per mint {limit_per_mint}. Mint operation is invalid.")
        conn.close()
        return

    if current_supply + amount > max_supply:
        print(f"Mint operation exceeds max supply for token {tick}. Mint operation is invalid.")
        conn.close()
        return

    # Update current supply
    new_supply = current_supply + amount
    c.execute('UPDATE tokens SET current_supply = ? WHERE tick = ?', (new_supply, tick))

    # Record the mint operation
    c.execute('''
        CREATE TABLE IF NOT EXISTS mints (
            mint_id INTEGER PRIMARY KEY AUTOINCREMENT,
            tick TEXT NOT NULL,
            mint_txid TEXT UNIQUE NOT NULL,
            amount INTEGER NOT NULL CHECK (amount > 0),
            FOREIGN KEY (tick) REFERENCES tokens (tick) ON DELETE CASCADE
        )
    ''')

    try:
        c.execute('INSERT INTO mints (mint_txid, tick, amount) VALUES (?, ?, ?)', (txid, tick, amount))
        conn.commit()
        print(f"Mint operation for {amount} of {tick} saved to database at {db_path}")
    except sqlite3.IntegrityError as e:
        print(f"Skipping mint operation for transaction {txid}: {e}")
    finally:
        conn.close()

# Main loop to continuously scan for new blocks
def main():
    last_block_height = load_last_block_height()
    while True:
        rpc_connection = connect_to_rpc()
        if rpc_connection is None:
            time.sleep(60)  # Wait before retrying
            continue

        try:
            current_block_height = rpc_connection.getblockcount()
            start_block_height = last_block_height + 1

            # Process any new blocks
            for block_height in range(start_block_height, current_block_height + 1):
                block_hash = rpc_connection.getblockhash(block_height)
                # Fetch block with transactions decoded
                block = rpc_connection.getblock(block_hash, 2)
                transactions = block['tx']
                for tx in transactions:
                    process_transaction(tx, rpc_connection)
                update_last_block_height(block_height)
                last_block_height = block_height

            # Wait for 30 sec before checking for new blocks
            time.sleep(30)
        except (BrokenPipeError, JSONRPCException) as e:
            print(f"RPC error: {e}")
            time.sleep(1)  # Wait before retrying
        except Exception as e:
            print(f"Unexpected error: {e}")
            time.sleep(1)  # Wait before retrying

if __name__ == "__main__":
    main()
