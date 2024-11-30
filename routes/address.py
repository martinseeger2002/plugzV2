# routes/address.py
from flask import Blueprint, jsonify
from utils.decorators import require_api_key
from utils.rpc_utils import get_rpc_connection
from bitcoinrpc.authproxy import JSONRPCException

address_bp = Blueprint('address', __name__)

@address_bp.route('/api/v1/get_address_balance/<ticker>/<address>', methods=['GET'])
@require_api_key
def get_address_balance(ticker, address):
    rpc_connection = get_rpc_connection(ticker)
    try:
        utxos = rpc_connection.listunspent(0, 9999999, [address])
        confirmed_balance = sum(utxo['amount'] for utxo in utxos if utxo['confirmations'] >= 1)
        unconfirmed_balance = sum(utxo['amount'] for utxo in utxos if utxo['confirmations'] == 0)
        return jsonify({
            "status": "success",
            "data": {
                "network": ticker,
                "address": address,
                "confirmed_balance": str(confirmed_balance),
                "unconfirmed_balance": str(unconfirmed_balance)
            }
        })
    except JSONRPCException as e:
        return jsonify({"status": "error", "message": str(e)}), 400

@address_bp.route('/api/v1/get_tx_unspent/<ticker>/<address>', methods=['GET'])
@require_api_key
def get_unspent_txs(ticker, address):
    rpc_connection = get_rpc_connection(ticker)
    try:
        utxos = rpc_connection.listunspent(0, 9999999, [address])
        return jsonify({
            "status": "success",
            "data": {
                "network": ticker,
                "address": address,
                "txs": [
                    {
                        "txid": utxo['txid'],
                        "vout": utxo['vout'],
                        "script_hex": utxo['scriptPubKey'],
                        "value": utxo['amount'],
                        "confirmations": utxo['confirmations']
                    } for utxo in utxos
                ]
            }
        })
    except JSONRPCException as e:
        return jsonify({"status": "error", "message": str(e)}), 400

@address_bp.route('/api/v1/is_valid_address/<ticker>/<address>', methods=['GET'])
@require_api_key
def is_valid_address(ticker, address):
    rpc_connection = get_rpc_connection(ticker)
    try:
        validity = rpc_connection.validateaddress(address)
        return jsonify({
            "status": "success",
            "data": {
                "is_valid": validity['isvalid']
            }
        })
    except JSONRPCException as e:
        return jsonify({"status": "error", "message": str(e)}), 400
