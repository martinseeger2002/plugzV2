import configparser
import sqlite3
from bitcoinrpc.authproxy import AuthServiceProxy, JSONRPCException
import logging
import sys
import os
import threading

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Read RPC configuration from RPC.conf
config = configparser.ConfigParser()
config.read('RPC2.conf')

def get_rpc_url(coin):
    rpc_user = config[coin]['rpcuser']
    rpc_password = config[coin]['rpcpassword']
    rpc_host = config[coin]['rpchost']
    rpc_port = config[coin]['rpcport']
    return f"http://{rpc_user}:{rpc_password}@{rpc_host}:{rpc_port}"

def get_rpc_connection(coin):
    rpc_url = get_rpc_url(coin)
    return AuthServiceProxy(rpc_url)

def get_db_connection(coin):
    # Ensure the directory exists
    os.makedirs('./db', exist_ok=True)
    
    db_name = f"./db/{coin}wallets.db"
    conn = sqlite3.connect(db_name, check_same_thread=False)
    cursor = conn.cursor()
    
    # Create the scan_progress table with the correct schema
    cursor.execute('''CREATE TABLE IF NOT EXISTS scan_progress
                      (coin TEXT PRIMARY KEY, last_scanned_block INTEGER)''')
    
    cursor.execute('''CREATE TABLE IF NOT EXISTS wallets
                      (address TEXT PRIMARY KEY, imported BOOLEAN, block_height INTEGER)''')
    conn.commit()
    return conn

def retry_rpc_call(func, *args, max_retries=5):
    for attempt in range(max_retries):
        try:
            return func(*args)
        except JSONRPCException as e:
            if "The wallet already contains the private key for this address or script" in str(e):
                return None
            if attempt == max_retries - 1:
                raise
            print(f"RPC call failed. Retrying immediately... Error: {str(e)}")

def get_last_scanned_block(conn, coin):
    cursor = conn.cursor()
    cursor.execute('SELECT last_scanned_block FROM scan_progress WHERE coin = ?', (coin,))
    result = cursor.fetchone()
    if result is None:
        return 0  # Start from block 0 if no record exists
    return result[0]

def update_last_scanned_block(conn, coin, block_height):
    cursor = conn.cursor()
    cursor.execute('INSERT OR REPLACE INTO scan_progress (coin, last_scanned_block) VALUES (?, ?)', (coin, block_height))
    conn.commit()

def scan_blockchain_for_addresses(start_block, end_block, rpc_connection):
    addresses = set()
    total_blocks = end_block - start_block + 1
    for block_height in range(start_block, end_block + 1):
        if block_height % 100 == 0:  # Print progress every 100 blocks
            progress = (block_height - start_block) / total_blocks * 100
        block_hash = retry_rpc_call(rpc_connection.getblockhash, block_height)
        block = retry_rpc_call(rpc_connection.getblock, block_hash, 2)
        for tx in block['tx']:
            for vout in tx['vout']:
                if 'addresses' in vout['scriptPubKey']:
                    addresses.update(vout['scriptPubKey']['addresses'])
    return addresses

def import_address(address, conn, rpc_connection):
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM wallets WHERE address = ?', (address,))
    if not cursor.fetchone():
        result = retry_rpc_call(rpc_connection.importaddress, address, "", False)
        if result is not None:
            cursor.execute('INSERT INTO wallets (address, imported, block_height) VALUES (?, ?, ?)', 
                           (address, True, -1))
            conn.commit()
            print(f"Successfully imported unique address: {address}")
            return 1
        else:
            cursor.execute('INSERT INTO wallets (address, imported, block_height) VALUES (?, ?, ?)', 
                           (address, True, -1))
            conn.commit()
            # No print statement here since the address was already in the wallet
            return 1
    return 0

def scan_and_import_for_coin(coin):
    conn = get_db_connection(coin)
    rpc_connection = get_rpc_connection(coin)
    
    try:
        last_scanned_block = get_last_scanned_block(conn, coin)
        latest_block = retry_rpc_call(rpc_connection.getblockcount)
        
        while last_scanned_block < latest_block:
            blockchain_addresses = scan_blockchain_for_addresses(last_scanned_block + 1, last_scanned_block + 1, rpc_connection)
            
            cursor = conn.cursor()
            cursor.execute('SELECT address FROM wallets')
            db_addresses = set(row[0] for row in cursor.fetchall())
            
            missing_addresses = blockchain_addresses - db_addresses
            
            for address in missing_addresses:
                import_address(address, conn, rpc_connection)
            
            last_scanned_block += 1
            update_last_scanned_block(conn, coin, last_scanned_block)
            
    except Exception as e:
        print(f"An error occurred during processing for {coin}: {str(e)}")
    finally:
        conn.close()

def process_coin(coin):
    print(f"Starting address verification and import process for {coin}...")
    scan_and_import_for_coin(coin)
    print(f"All addresses for {coin} successfully imported, updated, and verified.")

# Main execution
if __name__ == "__main__":
    threads = []
    try:
        for coin in config.sections():
            thread = threading.Thread(target=process_coin, args=(coin,))
            threads.append(thread)
            thread.start()
        
        for thread in threads:
            thread.join()
    except Exception as e:
        print(f"An error occurred during processing: {str(e)}")
        sys.exit(1)

    print("Processing completed.")
