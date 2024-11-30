# utils/rpc_utils.py
from bitcoinrpc.authproxy import AuthServiceProxy
from config.config import rpc_configs

def get_rpc_connection(ticker):
    ticker = ticker.upper()
    if ticker in rpc_configs:
        cfg = rpc_configs[ticker]
        return AuthServiceProxy(
            f"http://{cfg['rpc_user']}:{cfg['rpc_password']}@{cfg['rpc_host']}:{cfg['rpc_port']}"
        )
    else:
        raise ValueError(f"No RPC configuration found for ticker: {ticker}")
