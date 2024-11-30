from bitcoinrpc.authproxy import AuthServiceProxy, JSONRPCException
from decimal import Decimal

# Configuration
RPC_USER = "1234"
RPC_PASSWORD = "pass"
RPC_HOST = "127.0.0.1"
RPC_PORT = 22555

# Connect to the Dogecoin node
rpc_connection = AuthServiceProxy(f"http://{RPC_USER}:{RPC_PASSWORD}@{RPC_HOST}:{RPC_PORT}")

# Initial Transaction ID and specific output index to inspect
txid = "2d8df4f021c8a47f4612b15c342d7caafbc180912d12e08fac51165a9c369bad"
output_index = 3

def get_transaction_details(txid):
    try:
        transaction = rpc_connection.getrawtransaction(txid, True)
    except JSONRPCException as e:
        print(f"An error occurred: {e}")
        return None

    return transaction

def print_script_hex_of_output(txid, vout_index):
    transaction = get_transaction_details(txid)
    if not transaction:
        return

    try:
        output = transaction['vout'][vout_index]
        script_hex = output['scriptPubKey']['hex']
        amount = output['value']
        
        # Extract first and last 6 bytes of txid and script hex
        txid_short = txid[:6] + "..." + txid[-6:]
        script_hex_short = script_hex[:6] + "..." + script_hex[-6:]
        
        print(f"Initial TXID: {txid_short}, VOUT Index: {vout_index}, Amount: {amount}, Script Hex: {script_hex_short}")
    except IndexError:
        print(f"Output index {vout_index} is out of range for transaction {txid}")

# Example usage
print_script_hex_of_output(txid, output_index)
