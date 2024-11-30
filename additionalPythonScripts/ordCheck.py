import configparser
import os
import sqlite3
from datetime import datetime
from bitcoinrpc.authproxy import AuthServiceProxy, JSONRPCException
import json

# Load RPC credentials from rpc2.conf
config = configparser.ConfigParser()
config_path = '/root/LuckycoinAPI/RPC2.conf'  # Ensure this matches the actual file name and path
if not os.path.exists(config_path):
    raise FileNotFoundError("Config file not found.")
else:
    config.read(config_path)

DB_NAME = "./db/ord_index.db"
BLOCK_HEIGHT_LIMIT = 0  # Define the block height limit for tracing ordinals

class CoinRPC:
    def __init__(self, coin_type):
        self.coin_type = coin_type.upper()
        if not config.has_section(self.coin_type):
            raise ValueError(f"Configuration for coin type '{self.coin_type}' not found in rpc2.conf.")
        
        self.rpc_user = config.get(self.coin_type, 'rpcuser')
        self.rpc_password = config.get(self.coin_type, 'rpcpassword')
        self.rpc_host = config.get(self.coin_type, 'rpchost')
        self.rpc_port = config.getint(self.coin_type, 'rpcport')
        
        self.rpc_connection = None
        self.connect()

    def connect(self):
        rpc_url = f"http://{self.rpc_user}:{self.rpc_password}@{self.rpc_host}:{self.rpc_port}"
        self.rpc_connection = AuthServiceProxy(rpc_url)

    def get_transaction(self, txid):
        try:
            tx = self.rpc_connection.getrawtransaction(txid, True)
            if 'blockhash' in tx:
                block = self.rpc_connection.getblock(tx['blockhash'])
                tx['blocktime'] = block['time']
            else:
                tx['blocktime'] = None
            return tx
        except JSONRPCException as e:
            return None

    def get_sigscript_asm(self, txid, vout):
        try:
            tx = self.get_transaction(txid)
            return tx['vin'][vout]['scriptSig']['asm'] if tx else None
        except IndexError:
            return None
        except JSONRPCException as e:
            return None

    def reverse_and_flip_pairs(self, hex_string):
        reversed_string = hex_string[::-1]
        flipped_pairs_string = ''.join([reversed_string[i+1] + reversed_string[i] for i in range(0, len(reversed_string), 2)])
        return flipped_pairs_string

    def trace_ordinal_and_sms(self, txid):
        initial_sigscript_asm = self.get_sigscript_asm(txid, 0)
        if initial_sigscript_asm:
            asm_parts = initial_sigscript_asm.split()
            if asm_parts[0] == "6582895":
                if asm_parts[2] == "0" and asm_parts[5] == "11":
                    delegate_child_txid = txid
                    genesis_txid_flipped = self.reverse_and_flip_pairs(asm_parts[6])
                    return {
                        "type": "ord",
                        "genesis_txid": genesis_txid_flipped,
                        "child_txid": delegate_child_txid
                    }
                else:
                    return {"type": "ord", "genesis_txid": txid}
            elif asm_parts[0] == "7564659":
                return {"type": "sms", "sms_txid": txid}
        return {"type": "none"}

def initialize_db():
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS ord_index (
            txid TEXT PRIMARY KEY,
            type TEXT,
            genesis_txid TEXT,
            sms_txid TEXT,
            child_txid TEXT,
            timestamp TEXT
        )
    """)
    conn.commit()
    conn.close()

def save_to_db(data):
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute("""
        INSERT OR REPLACE INTO ord_index (txid, type, genesis_txid, sms_txid, child_txid, timestamp)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (
        data.get('txid'),
        data.get('type'),
        data.get('genesis_txid'),
        data.get('sms_txid'),
        data.get('child_txid'),
        data.get('timestamp')
    ))
    conn.commit()
    conn.close()

def check_db_for_txid(txid):
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM ord_index WHERE txid = ?", (txid,))
    result = cursor.fetchone()
    conn.close()
    return result

def process_transaction(coin, txid):
    existing_record = check_db_for_txid(txid)
    if existing_record:
        result = {
            "txid": existing_record[0],
            "type": existing_record[1],
            "genesis_txid": existing_record[2],
            "sms_txid": existing_record[3],
            "child_txid": existing_record[4],
            "timestamp": existing_record[5]
        }
        return json.dumps(result, indent=4)

    try:
        coin_rpc = CoinRPC(coin)
    except ValueError as e:
        return json.dumps({"error": str(e)})

    trace_result = coin_rpc.trace_ordinal_and_sms(txid)
    
    if trace_result['type'] == 'none':
        return json.dumps({"error": "Not an ord or sms"})
    
    tx_details = coin_rpc.get_transaction(txid)
    timestamp = None
    if tx_details and 'blocktime' in tx_details:
        timestamp = datetime.utcfromtimestamp(tx_details['blocktime']).strftime('%Y-%m-%d %H:%M:%S')
    
    data = {
        'txid': txid,
        'type': trace_result['type'],
        'genesis_txid': trace_result.get('genesis_txid'),
        'sms_txid': trace_result.get('sms_txid'),
        'child_txid': trace_result.get('child_txid'),
        'timestamp': timestamp
    }
    
    save_to_db(data)
    
    return json.dumps(data, indent=4)