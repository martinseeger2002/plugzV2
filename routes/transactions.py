# routes/transactions.py
from flask import Blueprint, jsonify, request
from utils.decorators import require_api_key
from utils.rpc_utils import get_rpc_connection
from bitcoinrpc.authproxy import JSONRPCException

transactions_bp = Blueprint('transactions', __name__)

@transactions_bp.route('/api/v1/get_tx/<ticker>/<txid>', methods=['GET'])
@require_api_key
def get_transaction(ticker, txid):
    rpc_connection = get_rpc_connection(ticker)
    try:
        tx = rpc_connection.getrawtransaction(txid, True)
        
        def get_address_from_scriptPubKey(scriptPubKey):
            if 'addresses' in scriptPubKey:
                return scriptPubKey['addresses'][0]
            elif 'address' in scriptPubKey:
                return scriptPubKey['address']
            else:
                return "Unknown"
        
        return jsonify({
            "status": "success",
            "data": {
                "network": ticker,
                "txid": txid,
                "block_no": tx.get('blockhash', None),
                "confirmations": tx.get('confirmations', 0),
                "time": tx.get('time', 0),
                "inputs": [{"txid": vin.get('txid'), "vout": vin.get('vout')} for vin in tx['vin']],
                "outputs": [
                    {
                        "index": vout['n'],
                        "address": get_address_from_scriptPubKey(vout['scriptPubKey']),
                        "value": str(vout['value']),
                        "script_hex": vout['scriptPubKey'].get('hex', '')
                    } for vout in tx['vout']
                ]
            }
        })
    except JSONRPCException as e:
        return jsonify({"status": "error", "message": str(e)}), 400

@transactions_bp.route('/api/v1/send_raw_tx/<ticker>', methods=['POST'])
@require_api_key
def send_transaction(ticker):
    rpc_connection = get_rpc_connection(ticker)
    tx_hex = request.json.get('tx_hex')
    if not tx_hex:
        return jsonify({"status": "error", "message": "Missing tx_hex in request body"}), 400
    try:
        txid = rpc_connection.sendrawtransaction(tx_hex)
        return jsonify({
            "status": "success",
            "data": {
                "txid": txid
            }
        })
    except JSONRPCException as e:
        return jsonify({"status": "error", "message": str(e)}), 400

@transactions_bp.route('/api/v1/decoderawtransaction/<ticker>', methods=['POST'])
@require_api_key
def decode_raw_transaction(ticker):
    rpc_connection = get_rpc_connection(ticker)
    try:
        hexstring = request.json.get('hexstring')
        if not hexstring:
            return jsonify({"status": "error", "message": "Missing hexstring in request body"}), 400
        
        decoded_tx = rpc_connection.decoderawtransaction(hexstring)
        return jsonify({
            "status": "success",
            "data": decoded_tx
        })
    except JSONRPCException as e:
        return jsonify({"status": "error", "message": str(e)}), 400

@transactions_bp.route('/api/v1/decodescript/<ticker>', methods=['POST'])
@require_api_key
def decode_script(ticker):
    rpc_connection = get_rpc_connection(ticker)
    try:
        hexstring = request.json.get('hexstring')
        if not hexstring:
            return jsonify({"status": "error", "message": "Missing hexstring in request body"}), 400
        
        decoded_script = rpc_connection.decodescript(hexstring)
        return jsonify({
            "status": "success",
            "data": decoded_script
        })
    except JSONRPCException as e:
        return jsonify({"status": "error", "message": str(e)}), 400
