# tasks/scheduled_tasks.py
from apscheduler.schedulers.background import BackgroundScheduler
import subprocess
import sqlite3
import time
from config.config import rpc_configs
from bitcoinrpc.authproxy import AuthServiceProxy, JSONRPCException
import os
from datetime import datetime
from contextlib import contextmanager

def trigger_blockchain_rescan():
    for ticker, cfg in rpc_configs.items():
        try:
            rpc_connection = AuthServiceProxy(
                f"http://{cfg['rpc_user']}:{cfg['rpc_password']}@{cfg['rpc_host']}:{cfg['rpc_port']}"
            )
            start_height = 0
            result = rpc_connection.rescanblockchain(start_height)
            print(f"Blockchain rescan started for {ticker}: {result}")
        except JSONRPCException as e:
            print(f"Error triggering blockchain rescan for {ticker}: {e}")

def load_ltc_wallet():
    cfg = rpc_configs.get("LTC")
    if not cfg:
        print("LTC configuration not found.")
        return

    try:
        rpc_connection = AuthServiceProxy(
            f"http://{cfg['rpc_user']}:{cfg['rpc_password']}@{cfg['rpc_host']}:{cfg['rpc_port']}"
        )
        wallet_name = "/wallets/wallet.dat"  # Replace with your actual wallet file name
        try:
            rpc_connection.loadwallet(wallet_name)
            print(f"LTC wallet {wallet_name} loaded successfully.")
        except JSONRPCException as e:
            if "already loaded" in str(e):
                print(f"LTC wallet {wallet_name} is already loaded.")
            else:
                print(f"Failed to load LTC wallet {wallet_name}: {e}")
    except JSONRPCException as e:
        print(f"Error loading LTC wallet: {e}")

        
def reset_daily_request_counts():
    conn = sqlite3.connect('./db/APIkeys.db')
    cursor = conn.cursor()
    cursor.execute('SELECT user_id, num_requests_today FROM api_keys')
    rows = cursor.fetchall()

    for user_id, num_requests_today in rows:
        cursor.execute('''
            UPDATE api_keys
            SET num_requests_yesterday = ?,
                num_requests_today = 0
            WHERE user_id = ?
        ''', (num_requests_today, user_id))

    conn.commit()
    conn.close()

def run_credit_bot():
    original_dir = os.getcwd()  # Save the current working directory
    try:
        os.chdir('./addCreditBot')
        subprocess.run(['python3', 'walletWatcher.py'], check=True)
        time.sleep(10)
        subprocess.run(['python3', 'creditBot.py'], check=True)
    finally:
        os.chdir(original_dir)

@contextmanager
def change_directory(destination):
    original_dir = os.getcwd()
    try:
        os.chdir(destination)
        yield
    finally:
        os.chdir(original_dir)

def run_rc001_indexer():
    with change_directory('./rc001'):
        subprocess.run(['python3', 'rc001indexer.py'], check=True)

scheduler = BackgroundScheduler()


scheduler.add_job(
    func=trigger_blockchain_rescan,
    trigger='cron',
    hour=4,
    minute=0,
    timezone='America/Chicago'
)
scheduler.add_job(
    func=reset_daily_request_counts,
    trigger='cron',
    hour=0,
    minute=0,
    timezone='America/Chicago'
)

scheduler.add_job(
    func=run_credit_bot,
    trigger='cron',
    minute='*',
    timezone='America/Chicago'
)


