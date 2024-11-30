# config/config.py
import configparser

config = configparser.ConfigParser()
config.read('./config/RPC2.conf')

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

API_KEY = 'plugz1234'  # Ensure this is the correct API key
