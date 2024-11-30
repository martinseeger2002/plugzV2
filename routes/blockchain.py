# routes/blockchain.py
from flask import Blueprint, jsonify, request
from utils.decorators import require_api_key
from utils.rpc_utils import get_rpc_connection
from bitcoinrpc.authproxy import JSONRPCException
import logging



blockchain_bp = Blueprint('blockchain', __name__)

@blockchain_bp.route('/api/v1/get_block/<ticker>/<block_hash_or_height>', methods=['GET'])
@require_api_key
def get_block(ticker, block_hash_or_height):
    rpc_connection = get_rpc_connection(ticker)
    try:
        if block_hash_or_height.isdigit():
            block_hash = rpc_connection.getblockhash(int(block_hash_or_height))
        else:
            block_hash = block_hash_or_height
        block = rpc_connection.getblock(block_hash)
        return jsonify({
            "status": "success",
            "data": {
                "network": ticker,
                "block_no": block['height'],
                "hash": block['hash'],
                "time": block['time'],
                "txs": block['tx']
            }
        })
    except JSONRPCException as e:
        return jsonify({"status": "error", "message": str(e)}), 400

@blockchain_bp.route('/api/v1/latest_blocks_summary/<ticker>', methods=['GET'])
@require_api_key
def get_latest_blocks_summary(ticker):
    rpc_connection = get_rpc_connection(ticker)
    try:
        best_block_hash = rpc_connection.getbestblockhash()
        blocks = []
        for i in range(10):
            block = rpc_connection.getblock(best_block_hash)
            blocks.append({
                "height": block['height'],
                "miner": "Unknown",
                "time": block['time'],
                "num_txs": len(block['tx']),
                "difficulty": block['difficulty'],
                "size": block['size'],
                "weight": block.get('weight', 0),
                "version": block['version'],
                "reward_and_fees": "N/A",
                "price": {
                    "value": "N/A",
                    "currency": "USD"
                }
            })
            if 'previousblockhash' in block:
                best_block_hash = block['previousblockhash']
            else:
                break
        return jsonify({
            "status": "success",
            "data": {
                "blocks": blocks
            }
        })
    except JSONRPCException as e:
        return jsonify({"status": "error", "message": str(e)}), 400

@blockchain_bp.route('/api/v1/best_block_hash/<ticker>', methods=['GET'])
@require_api_key
def get_best_block_hash(ticker):
    rpc_connection = get_rpc_connection(ticker)
    try:
        best_block_hash = rpc_connection.getbestblockhash()
        return jsonify({
            "status": "success",
            "data": {
                "hash": best_block_hash
            }
        })
    except JSONRPCException as e:
        return jsonify({"status": "error", "message": str(e)}), 400

@blockchain_bp.route('/api/v1/import_address/<ticker>', methods=['POST'])
@require_api_key
def import_address(ticker):
    rpc_connection = get_rpc_connection(ticker)
    data = request.json

    # Log the incoming request data
    logging.info(f"Received import address request: {data}")

    # Extract address from the request
    address = data.get('address')

    if not address or not isinstance(address, str) or address.strip() == '':
        return jsonify({"status": "error", "message": "A single valid address is required."}), 400

    try:
        # Import the address without rescan
        rpc_connection.importaddress(address, "", False)  # Use positional arguments
        return jsonify({
            "status": "success",
            "imported_address": address
        }), 200
    except JSONRPCException as e:
        logging.error(f"Error importing address: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@blockchain_bp.route('/api/v1/transactions/<ticker>/<address>/<int:page>', methods=['GET']) ## use this to get transactions for an address
@require_api_key
def get_address_transactions(ticker, address, page):
    rpc_connection = get_rpc_connection(ticker)
    try:
        # Start from the latest block
        best_block_hash = rpc_connection.getbestblockhash()
        transactions_found = []
        blocks_checked = 0
        transactions_per_page = 10
        start_index = (page - 1) * transactions_per_page
        max_blocks_to_check = 1000  # Set the maximum depth of blocks to search

        while len(transactions_found) < (page * transactions_per_page):
            if blocks_checked >= max_blocks_to_check:
                break  # Stop if max depth is reached without finding new transactions

            block = rpc_connection.getblock(best_block_hash)
            blocks_checked += 1

            for txid in block['tx']:
                raw_tx = rpc_connection.getrawtransaction(txid, True)
                
                # Determine "from" addresses
                from_addresses = []
                for vin in raw_tx['vin']:
                    if 'txid' in vin:
                        prev_tx = rpc_connection.getrawtransaction(vin['txid'], True)
                        prev_vout = prev_tx['vout'][vin['vout']]
                        if 'addresses' in prev_vout['scriptPubKey']:
                            from_addresses.extend(prev_vout['scriptPubKey']['addresses'])

                # Determine "to" addresses and check if the transaction involves the specified address
                for vout in raw_tx['vout']:
                    if 'addresses' in vout['scriptPubKey']:
                        to_addresses = vout['scriptPubKey']['addresses']
                        if address in to_addresses or address in from_addresses:
                            tx_details = {
                                "hash": raw_tx['txid'],
                                "value": vout['value'],
                                "time": raw_tx['time'],
                                "block": block['height'],
                                "confirmations": block['confirmations'],
                                "from": from_addresses,
                                "to": to_addresses,
                                "type": "receive" if address in to_addresses else "send"
                            }
                            transactions_found.append(tx_details)
                            blocks_checked = 0  # Reset the block depth counter
                            break  # No need to check other outputs if address is found

            # Move to the previous block
            if 'previousblockhash' in block:
                best_block_hash = block['previousblockhash']
            else:
                break  # No more blocks to check

        # Paginate the results
        paginated_transactions = transactions_found[start_index:start_index + transactions_per_page]

        return jsonify({
            "status": "success",
            "data": {
                "transactions": paginated_transactions
            }
        })
    except JSONRPCException as e:
        return jsonify({"status": "error", "message": str(e)}), 400
    
@blockchain_bp.route('/api/v1/get_public_key/<ticker>/<address>', methods=['GET'])
@require_api_key
def get_public_key(ticker, address):
    rpc_connection = get_rpc_connection(ticker)
    try:
        # Get the list of transactions for the address
        transactions = rpc_connection.listtransactions("*", 1000, 0, True)  # Adjust count and skip as needed

        for tx in transactions:
            if 'address' in tx and tx['address'] == address and tx['category'] == 'send':
                # Get the raw transaction
                raw_tx = rpc_connection.getrawtransaction(tx['txid'], True)

                # Find the input that matches the address
                for vin in raw_tx['vin']:
                    prev_tx = rpc_connection.getrawtransaction(vin['txid'], True)
                    prev_vout = prev_tx['vout'][vin['vout']]

                    # Check if the address is in the previous output
                    if 'addresses' in prev_vout['scriptPubKey'] and address in prev_vout['scriptPubKey']['addresses']:
                        # Extract the public key from the scriptSig
                        script_sig = vin['scriptSig']['asm']
                        pubkey = script_sig.split()[-1]  # Assuming the last part is the public key
                        return jsonify({
                            "status": "success",
                            "public_key": pubkey
                        }), 200

        return jsonify({"status": "error", "message": "Public key not found for the given address."}), 404

    except JSONRPCException as e:
        logging.error(f"Error retrieving public key: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500