import configparser
import sqlite3
from bitcoinrpc.authproxy import AuthServiceProxy, JSONRPCException
import logging
import os
import time
import threading

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Read RPC configuration from RPC.conf
config = configparser.ConfigParser()
config.read('RPC2.conf')

DB_DIR = '../db'

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
    os.makedirs(DB_DIR, exist_ok=True)
    
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

def get_wallet_count(conn):
    cursor = conn.cursor()
    cursor.execute('SELECT COUNT(*) FROM wallets')
    return cursor.fetchone()[0]

def monitor_coin_progress(coin):
    conn = get_db_connection(coin)
    rpc_connection = get_rpc_connection(coin)
    
    try:
        while True:
            last_scanned_block = get_last_scanned_block(conn, coin)
            latest_block = retry_rpc_call(rpc_connection.getblockcount)
            wallet_count = get_wallet_count(conn)
            
            # Calculate and print the percentage done
            percent_done = (last_scanned_block / latest_block) * 100
            print(f"{coin}: {percent_done:.2f}% done (Last Scanned Block: {last_scanned_block}, Latest Block: {latest_block}, Wallet Count: {wallet_count})")
            
            time.sleep(10)  # Wait for 10 seconds before checking again
            
    except Exception as e:
        print(f"An error occurred during processing for {coin}: {str(e)}")
    finally:
        conn.close()

def main():
    coins = ['DOGE', 'LKY', 'LTC', 'PEPE']  # Add other coins as needed
    threads = []
    for coin in coins:
        thread = threading.Thread(target=monitor_coin_progress, args=(coin,))
        threads.append(thread)
        thread.start()
    
    for thread in threads:
        thread.join()

if __name__ == "__main__":
    main()
