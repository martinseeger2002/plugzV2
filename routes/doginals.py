# routes/doginals.py
from flask import Blueprint, request, jsonify
import subprocess

doginals_bp = Blueprint('doginals', __name__)

def call_node_script(*args):
    command = ['node', 'doginals/doginals.js'] + list(args)
    result = subprocess.run(command, capture_output=True, text=True)
    return result.stdout, result.stderr

@doginals_bp.route('/wallet/new', methods=['POST'])
def create_wallet():
    stdout, _ = call_node_script('wallet', 'new')  # Ignore stderr by using _
    return jsonify({'stdout': stdout})

@doginals_bp.route('/wallet/sync', methods=['POST'])
def sync_wallet():
    data = request.json
    stdout, stderr = call_node_script('wallet', 'sync', data['wallet_address'])
    return jsonify({'stdout': stdout, 'stderr': stderr})

@doginals_bp.route('/wallet/send', methods=['POST'])
def send_funds():
    data = request.json
    stdout, stderr = call_node_script('wallet', 'send', data['recipient_address'], data['amount'], data['utxos'], data['private_key'])
    return jsonify({'stdout': stdout})

@doginals_bp.route('/wallet/split', methods=['POST'])
def split_utxos():
    data = request.json
    stdout, stderr = call_node_script('wallet', 'split', data['number_of_splits'], data['utxos'], data['private_key'])
    return jsonify({'stdout': stdout})

@doginals_bp.route('/wallet/brocastraw', methods=['POST'])
def broadcast_raw_transaction():
    data = request.json
    stdout, stderr = call_node_script('wallet', 'brocastraw', data['raw_transaction_hex'])
    return jsonify({'stdout': stdout})

@doginals_bp.route('/drc-20/deploy', methods=['POST'])
def deploy_drc20():
    data = request.json
    stdout, stderr = call_node_script('drc-20', 'deploy', data['address'], data['ticker'], data['max'], data['limit'])
    return jsonify({'stdout': stdout})

@doginals_bp.route('/drc-20/mint', methods=['POST'])
def mint_drc20():
    data = request.json
    stdout, stderr = call_node_script('drc-20', 'mint', data['address'], data['ticker'], data['amount'], data['repeat'])
    return jsonify({'stdout': stdout})

@doginals_bp.route('/mint', methods=['POST'])
def mint_item():
    data = request.json
    stdout, stderr = call_node_script('mint', data['recipient_address'], data['content_type_or_filename'], data['hex_data'], data['utxos'], data['private_key'])
    return jsonify({'stdout': stdout})

# Usage comments:
# POST /wallet/new with JSON body: {"private_key": "<private_key>", "address": "<address>"}
# POST /wallet/sync with JSON body: {"wallet_address": "<wallet_address>"}
# POST /wallet/send with JSON body: {"recipient_address": "<recipient_address>", "amount": "<amount>", "utxos": "<utxos>", "private_key": "<private_key>"}
# POST /wallet/split with JSON body: {"number_of_splits": "<number_of_splits>", "utxos": "<utxos>", "private_key": "<private_key>"}
# POST /wallet/brocastraw with JSON body: {"raw_transaction_hex": "<raw_transaction_hex>"}
# POST /drc-20/deploy with JSON body: {"address": "<address>", "ticker": "<ticker>", "max": "<max>", "limit": "<limit>"}
# POST /drc-20/mint with JSON body: {"address": "<address>", "ticker": "<ticker>", "amount": "<amount>", "repeat": "<repeat>"}
# POST /mint with JSON body: {"recipient_address": "<recipient_address>", "content_type_or_filename": "<content_type_or_filename>", "hex_data": "<hex_data>", "utxos": "<utxos>", "private_key": "<private_key>"}
