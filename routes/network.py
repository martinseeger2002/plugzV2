# routes/network.py
from flask import Blueprint, jsonify
from utils.decorators import require_api_key
from utils.rpc_utils import get_rpc_connection
import requests
import time
from bitcoinrpc.authproxy import JSONRPCException

network_bp = Blueprint('network', __name__)

@network_bp.route('/api/v1/price/<ticker>/<int:unix_timestamp>', methods=['GET'])
@network_bp.route('/api/v1/price/<ticker>', methods=['GET'])
@require_api_key
def get_price(ticker, unix_timestamp=None):
    try:
        response = requests.get(f'https://api.nonkyc.io/api/v2/asset/getbyticker/{ticker}')
        data = response.json()
        
        if 'usdValue' in data:
            price = float(data['usdValue'])
            return jsonify({
                "status": "success",
                "data": {
                    "value": str(price),
                    "currency": "USD",
                    "last_updated": data.get('lastPriceUpdate', int(time.time() * 1000))
                }
            })
        else:
            return jsonify({
                "status": "error",
                "message": "Price data not available"
            }), 404
    except requests.RequestException as e:
        return jsonify({
            "status": "error",
            "message": f"Failed to fetch price data: {str(e)}"
        }), 500

@network_bp.route('/api/v1/network_info/<ticker>', methods=['GET'])
@require_api_key
def get_network_info(ticker):
    rpc_connection = get_rpc_connection(ticker)
    try:
        network_info = rpc_connection.getnetworkinfo()
        blockchain_info = rpc_connection.getblockchaininfo()
        mempool_info = rpc_connection.getmempoolinfo()
        return jsonify({
            "status": "success",
            "data": {
                "block_count": blockchain_info['blocks'],
                "best_block_hash": blockchain_info['bestblockhash'],
                "hashrate": "N/A",
                "mempool": {
                    "mempool_txs": mempool_info['size'],
                    "mempool_size": mempool_info['bytes'],
                    "updated_at": int(time.time())
                }
            }
        })
    except JSONRPCException as e:
        return jsonify({"status": "error", "message": str(e)}), 400
