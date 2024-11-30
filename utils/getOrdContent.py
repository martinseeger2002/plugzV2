import configparser
from bitcoinrpc.authproxy import AuthServiceProxy, JSONRPCException
import binascii
import sqlite3
import base64
import time

# Read RPC configuration from RPC.conf
config = configparser.ConfigParser()
config.read('RPC.conf')

# Global database path
DB_PATH = '../db/content.db'

# Store configurations for each ticker
rpc_configs = {
    section.upper(): {
        'rpc_user': config[section]['rpcuser'],
        'rpc_password': config[section]['rpcpassword'],
        'rpc_host': config[section]['rpchost'],
        'rpc_port': config[section]['rpcport'],
    }
    for section in config.sections()
}

def get_rpc_connection(ticker):
    ticker = ticker.upper()
    if ticker in rpc_configs:
        cfg = rpc_configs[ticker]
        rpc_url = f"http://{cfg['rpc_user']}:{cfg['rpc_password']}@{cfg['rpc_host']}:{cfg['rpc_port']}"
        print(f"Connecting to RPC URL: {rpc_url}")  # Debugging line
        connection = AuthServiceProxy(rpc_url)
        print(f"Connection type: {type(connection)}")  # Debugging line
        return connection
    else:
        raise ValueError(f"No RPC configuration found for ticker: {ticker}")

def hex_to_ascii(hex_string):
    """ Convert hex string to ASCII """
    try:
        ascii_string = binascii.unhexlify(hex_string).decode('ascii')
        return ascii_string
    except Exception as e:
        print(f"Error converting hex to ASCII: {e}")
        return None

def process_genesis_tx(asm_data):
    """ Process the genesis transaction """
    global num_chunks
    data_string = ""
    num_chunks = int(asm_data[1].lstrip('-'))
    mime_type_hex = asm_data[2]
    mime_type = hex_to_ascii(mime_type_hex)

    index = 3
    while index < len(asm_data):
        if asm_data[index].lstrip('-').isdigit():
            num_chunks = int(asm_data[index].lstrip('-'))
            data_chunk = asm_data[index + 1].lstrip('-')  # Remove leading '-'
            # Validate each data chunk
            if all(c in '0123456789abcdefABCDEF' for c in data_chunk):
                data_string += data_chunk
            else:
                print(f"Invalid hex data chunk: {data_chunk}")
                return None, None, False
            index += 2

            if num_chunks == 0:
                return data_string, mime_type, True
        else:
            break

    return data_string, mime_type, False

def process_subsequent_tx(asm_data):
    """ Process subsequent transactions """
    global num_chunks
    data_string = ""
    index = 0
    while index < len(asm_data):
        if asm_data[index].lstrip('-').isdigit():
            num_chunks = int(asm_data[index].lstrip('-'))
            data_chunk = asm_data[index + 1].lstrip('-')  # Remove leading '-'
            # Validate each data chunk
            if all(c in '0123456789abcdefABCDEF' for c in data_chunk):
                data_string += data_chunk
            else:
                print(f"Invalid hex data chunk: {data_chunk}")
                return None, False
            index += 2

            if num_chunks == 0:
                return data_string, True
        else:
            break

    return data_string, False

def initialize_db():
    """ Initialize the SQLite database and create tables if they don't exist """
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS transactions (
            genesis_txid TEXT PRIMARY KEY,
            mime_type TEXT,
            base64_data TEXT,
            processing INTEGER DEFAULT 0
        )
    ''')
    conn.commit()
    conn.close()

def set_processing_flag(genesis_txid, processing):
    """ Set the processing flag for a transaction """
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('''
        UPDATE transactions
        SET processing = ?
        WHERE genesis_txid = ?
    ''', (processing, genesis_txid))
    conn.commit()
    conn.close()

def get_transaction_from_db(genesis_txid):
    """ Retrieve transaction data from the database """
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('SELECT mime_type, base64_data, processing FROM transactions WHERE genesis_txid = ?', (genesis_txid,))
    result = cursor.fetchone()
    conn.close()
    return result

def store_transaction(genesis_txid, mime_type, base64_data):
    """ Store transaction data in the database """
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('''
        INSERT OR IGNORE INTO transactions (genesis_txid, mime_type, base64_data, processing)
        VALUES (?, ?, ?, 0)
    ''', (genesis_txid, mime_type, base64_data))
    conn.commit()
    conn.close()

def delete_transaction(genesis_txid):
    """ Delete a transaction from the database """
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('DELETE FROM transactions WHERE genesis_txid = ?', (genesis_txid,))
    conn.commit()
    conn.close()

def process_tx(genesis_txid, depth=1000):
    # Initialize the database
    initialize_db()

    # Check if the transaction is already processed or being processed
    existing_data = get_transaction_from_db(genesis_txid)
    if existing_data:
        mime_type, base64_data, processing = existing_data
        if processing:
            print("Transaction is currently being processed.")
            return "Processing"
        if mime_type and base64_data:
            return {"mime_type": mime_type, "base64_data": base64_data}

    # Remove 'i0' suffix if present
    if genesis_txid.endswith('i0'):
        genesis_txid = genesis_txid[:-2]
        print(f"Modified genesis_txid: {genesis_txid}")

    # Set the processing flag
    set_processing_flag(genesis_txid, 1)

    max_retries = 3
    retry_delay = 5  # seconds

    for ticker in rpc_configs.keys():
        for attempt in range(max_retries):
            try:
                rpc_connection = get_rpc_connection(ticker)
                print(f"Attempting to process with {ticker.upper()} RPC (attempt {attempt + 1}/{max_retries})...")
                
                # Test the connection
                rpc_connection.getblockcount()
                
                # Attempt to get the transaction
                raw_tx = rpc_connection.getrawtransaction(genesis_txid, 1)
                
                # Process the transaction
                data_string = ""
                mime_type = None
                is_genesis = True
                txid = genesis_txid
                processed_txids = set()
                vout_index = 0

                while True:
                    if txid in processed_txids:
                        next_txid, vout_index = find_next_ordinal_tx(rpc_connection, txid, vout_index, depth, genesis_txid)
                        if next_txid:
                            txid = next_txid
                            continue
                        else:
                            break
                    processed_txids.add(txid)

                    raw_tx = rpc_connection.getrawtransaction(txid, 1)

                    for vin in raw_tx['vin']:
                        if 'scriptSig' in vin:
                            asm_data = vin['scriptSig'].get('asm', '').split()
                            print(f"Processing asm_data: {asm_data}")

                            if is_genesis:
                                if asm_data[0] == "6582895":
                                    new_data_string, mime_type, end_of_data = process_genesis_tx(asm_data)
                                    if new_data_string is None:
                                        delete_transaction(genesis_txid)
                                        return None
                                    data_string += new_data_string
                                    is_genesis = False
                                else:
                                    print("Invalid genesis transaction format.")
                                    delete_transaction(genesis_txid)
                                    return None
                            else:
                                new_data_string, end_of_data = process_subsequent_tx(asm_data)
                                if new_data_string is None:
                                    delete_transaction(genesis_txid)
                                    return None
                                data_string += new_data_string

                    # Break if we reached the last chunk
                    if end_of_data:
                        break

                    # Find the next ordinal transaction
                    if num_chunks > 0:
                        next_txid, vout_index = find_next_ordinal_tx(rpc_connection, txid, vout_index, depth, genesis_txid)
                        if next_txid:
                            txid = next_txid
                        else:
                            break
                    else:
                        break

                # Ensure the data string length is even
                if len(data_string) % 2 != 0:
                    data_string += "00000"  # Add five '0' characters

                # Validate hex data before conversion
                if all(c in '0123456789abcdefABCDEF' for c in data_string):
                    # Convert data_string to base64
                    base64_data = base64.b64encode(binascii.unhexlify(data_string)).decode('utf-8')
                else:
                    print("Error: Data string contains non-hexadecimal characters.")
                    delete_transaction(genesis_txid)
                    return None

                # Store the transaction data in the database
                if mime_type and base64_data:
                    store_transaction(genesis_txid, mime_type, base64_data)
                    set_processing_flag(genesis_txid, 0)  # Reset processing flag after successful storage
                    return {"mime_type": mime_type, "base64_data": base64_data}
                else:
                    print("Error: MIME type or base64 data is None, cannot store data.")
                    delete_transaction(genesis_txid)
                    return None
            
            except JSONRPCException as e:
                if "No such mempool or blockchain transaction" in str(e):
                    print(f"Transaction not found in {ticker.upper()} blockchain.")
                    break  # Move to the next coin type
                else:
                    print(f"JSONRPCException with {ticker.upper()} RPC: {e}")
            except ConnectionError as e:
                print(f"Connection error with {ticker.upper()} RPC: {e}")
            except Exception as e:
                print(f"Unexpected error with {ticker.upper()} RPC: {e}")
            
            if attempt < max_retries - 1:
                time.sleep(retry_delay)
            else:
                print(f"Max retries reached for {ticker.upper()} RPC.")
    
    # Reset the processing flag and delete the transaction if not found
    delete_transaction(genesis_txid)
    print("Transaction not found or unable to process with the specified blockchain.")
    return None

def find_next_ordinal_tx(rpc_connection, txid, vout_index, depth, genesis_txid):
    """Find the next transaction in the sequence."""
    try:
        raw_tx = rpc_connection.getrawtransaction(txid, 1)
        block_hash = raw_tx['blockhash']
        block_height = rpc_connection.getblock(block_hash)['height']

        for current_block_height in range(block_height, block_height + depth):
            block_hash = rpc_connection.getblockhash(current_block_height)
            block = rpc_connection.getblock(block_hash, 2)
            for block_tx in block['tx']:
                for vin in block_tx['vin']:
                    if 'txid' in vin and vin['txid'] == txid and vin['vout'] == vout_index:
                        next_txid = block_tx['txid']
                        return next_txid, vin['vout']
        return None, None
    except JSONRPCException as e:
        print(f"JSONRPCException while finding next ordinal tx: {e}")
        return None, None

if __name__ == "__main__":
    import sys
    if len(sys.argv) != 2:
        print("Usage: python script_name.py <genesis_txid>")
    else:
        genesis_txid = sys.argv[1]
        process_tx(genesis_txid, depth=500)
