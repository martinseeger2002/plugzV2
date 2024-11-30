import configparser
import sqlite3
from bitcoinrpc.authproxy import AuthServiceProxy, JSONRPCException
import logging
import sys
import threading
import time

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Read RPC configuration from RPC.conf
config = configparser.ConfigParser()
config.read('RPC.conf')

def get_rpc_url(coin):
    rpc_user = config[coin]['rpcuser']
    rpc_password = config[coin]['rpcpassword']
    rpc_host = config[coin]['rpchost']
    rpc_port = config[coin]['rpcport']
    return f"http://{rpc_user}:{rpc_password}@{rpc_host}:{rpc_port}"

# Thread-local storage for RPC connections
thread_local = threading.local()

def get_rpc_connection(coin):
    rpc_url = get_rpc_url(coin)
    return AuthServiceProxy(rpc_url)

def get_db_connection():
    conn = sqlite3.connect('wallets.db', check_same_thread=False)
    cursor = conn.cursor()
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
                logging.info(f"Address already in wallet with private key: {args[0] if args else ''}")
                return None
            if attempt == max_retries - 1:
                raise
            logging.warning(f"RPC call failed. Retrying... Error: {str(e)}")

def scan_blockchain_for_addresses(start_block, end_block, coin):
    rpc_connection = get_rpc_connection(coin)
    addresses = set()
    total_blocks = end_block - start_block + 1
    logging.info(f"Starting blockchain scan from block {start_block} to {end_block}")
    for block_height in range(start_block, end_block + 1):
        if block_height % 1000 == 0:  # Log progress every 1000 blocks
            progress = (block_height - start_block) / total_blocks * 100
            logging.info(f"Scanning block {block_height}/{end_block} ({progress:.2f}% complete)")
        block_hash = retry_rpc_call(rpc_connection.getblockhash, block_height)
        block = retry_rpc_call(rpc_connection.getblock, block_hash, 2)
        for tx in block['tx']:
            for vout in tx['vout']:
                if 'addresses' in vout['scriptPubKey']:
                    addresses.update(vout['scriptPubKey']['addresses'])
    logging.info(f"Blockchain scan complete. Found {len(addresses)} unique addresses.")
    return addresses

def import_address(address, conn, lock):
    rpc_connection = get_rpc_connection('DOGE')
    with lock:
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM wallets WHERE address = ?', (address,))
        if not cursor.fetchone():
            result = retry_rpc_call(rpc_connection.importaddress, address, "", False)
            if result is not None:
                cursor.execute('INSERT INTO wallets (address, imported, block_height) VALUES (?, ?, ?)', 
                               (address, True, -1))
                conn.commit()
                return 1
            else:
                cursor.execute('INSERT INTO wallets (address, imported, block_height) VALUES (?, ?, ?)', 
                               (address, True, -1))
                conn.commit()
                return 1
    return 0

def verify_and_import_addresses(conn, coin):
    cursor = conn.cursor()
    cursor.execute('SELECT COUNT(*) FROM wallets')
    db_count = cursor.fetchone()[0]

    rpc_connection = get_rpc_connection(coin)
    logging.info(f"Fetching addresses from RPC wallet for {coin}...")
    rpc_addresses = set(retry_rpc_call(rpc_connection.getaddressesbyaccount, ""))
    rpc_count = len(rpc_addresses)
    
    logging.info(f"Addresses in database: {db_count}")
    logging.info(f"Addresses in wallet: {rpc_count}")
    
    # Scan blockchain for addresses
    logging.info("Starting blockchain scan...")
    start_time = time.time()
    latest_block = retry_rpc_call(rpc_connection.getblockcount)
    blockchain_addresses = scan_blockchain_for_addresses(0, latest_block, coin)
    end_time = time.time()
    logging.info(f"Blockchain scan completed in {end_time - start_time:.2f} seconds")
    logging.info(f"Addresses found in blockchain: {len(blockchain_addresses)}")
    
    all_addresses = blockchain_addresses.union(rpc_addresses)
    logging.info(f"Total unique addresses (blockchain + wallet): {len(all_addresses)}")
    
    cursor.execute('SELECT address FROM wallets')
    db_addresses = set(row[0] for row in cursor.fetchall())
    
    missing_addresses = all_addresses - db_addresses
    
    lock = threading.Lock()
    imported_count = 0
    
    if missing_addresses:
        logging.info(f"Found {len(missing_addresses)} addresses missing from DB")
        for i, address in enumerate(missing_addresses, 1):
            imported_count += import_address(address, conn, lock)
            if i % 100 == 0:
                logging.info(f"Processed {i}/{len(missing_addresses)} missing addresses")
    else:
        logging.info("No missing addresses found")
    
    logging.info(f"Imported or updated {imported_count} addresses")
    
    return True

# Main execution
if __name__ == "__main__":
    conn = get_db_connection()
    
    try:
        coin = 'DOGE'  # Ensure this matches the section in your RPC.conf
        logging.info(f"Starting address verification and import process for {coin}...")
        if verify_and_import_addresses(conn, coin):
            logging.info("All addresses successfully imported, updated, and verified.")
        else:
            logging.info("Unexpected mismatch between imported addresses and wallet addresses. Please check the logs.")

    except Exception as e:
        logging.error(f"An error occurred during processing: {str(e)}")
        sys.exit(1)
    finally:
        conn.close()

    logging.info("Processing completed.")
