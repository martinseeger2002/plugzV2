import configparser
from bitcoinrpc.authproxy import AuthServiceProxy, JSONRPCException
from decimal import Decimal

# Read RPC configuration from RPC2.conf
config = configparser.ConfigParser()
config.read('RPC2.conf')  # Consider using an absolute path if needed

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

# Log available configurations
print(f"Available RPC configurations: {list(rpc_configs.keys())}")

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

ticker = None
rpc_connection = get_rpc_connection(ticker)

txid = None
output_index = None

def get_ord_genesis(ticker, txid, output_index):
    rpc_connection = get_rpc_connection(ticker) 
    return process_transaction(rpc_connection, txid, output_index)

def get_previous_tx_output(txid, vout):
    try:
        prev_tx = rpc_connection.getrawtransaction(txid, True)
        return prev_tx['vout'][vout]
    except JSONRPCException as e:
        print(f"An error occurred: {e}")
        return None

def process_transaction(txid, output_index):
    try:
        transaction = rpc_connection.getrawtransaction(txid, True)
    except JSONRPCException as e:
        print(f"An error occurred: {e}")
        return None, None

    # Check if this is a coinbase transaction
    if 'coinbase' in transaction['vin'][0]:
        print(f"Coinbase transaction found: TXID: {txid}")
        return None, None

    vins = transaction['vin']
    vouts = transaction['vout']

    vin_details = []
    for vin in vins:
        prev_tx_output = get_previous_tx_output(vin['txid'], vin['vout'])
        if prev_tx_output:
            vin_details.append((vin['txid'], vin['vout'], prev_tx_output['scriptPubKey']['hex']))
        else:
            vin_details.append((vin['txid'], vin['vout'], None))

    # Check the 'asm' field in the scriptSig of each vin
    for vin in vins:
        if 'scriptSig' in vin and 'asm' in vin['scriptSig']:
            asm = vin['scriptSig']['asm'].split()
            if len(asm) > 0 and asm[0] == '6582895':
                print(f"{txid} is ord")
                return None, None  # Stop tracing back

    # Print the script hex for each vout
    for vout_index, vout in enumerate(vouts):
        print(f"TXID: {txid}, VOUT Index: {vout_index}, Script Hex: {vout['scriptPubKey']['hex']}")

    # Continue tracing back through the first input
    if vin_details:
        vin_txid, vout_idx, script_hex = vin_details[0]
        print(f"Tracing back to Previous TXID: {vin_txid}, VOUT Index: {vout_idx}, Script Hex: {script_hex}")
        return vin_txid, vout_idx

    return None, None

# Loop until an error occurs
current_txid = txid
current_output_index = output_index

while current_txid is not None and current_output_index is not None:
    current_txid, current_output_index = process_transaction(current_txid, current_output_index)
