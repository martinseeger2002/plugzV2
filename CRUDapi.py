from flask import Flask, request, jsonify, session, render_template, redirect, url_for
from functools import wraps
import sqlite3
from werkzeug.security import generate_password_hash, check_password_hash
import bcrypt

app = Flask(__name__)
app.secret_key = 'your_secret_key_here'  # Replace with a secure secret key

APIKEYS_DB = './db/APIkeys.db'
ADMINS_DB = './db/admins.db'

def get_api_keys_db_connection():
    conn = sqlite3.connect(APIKEYS_DB)
    conn.row_factory = sqlite3.Row
    return conn

def get_admins_db_connection():
    conn = sqlite3.connect(ADMINS_DB)
    conn.row_factory = sqlite3.Row
    return conn

def get_users_db_connection():
    conn = sqlite3.connect('./db/minteruser.db')
    conn.row_factory = sqlite3.Row
    return conn

def init_dbs():
    # Initialize APIkeys.db
    conn = sqlite3.connect(APIKEYS_DB)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS api_keys (
            user_id TEXT PRIMARY KEY,
            api_key TEXT,
            creation_date TEXT,
            renewal_date TEXT,
            last_login_at INTEGER,
            plan_name TEXT,
            max_daily_requests INTEGER,
            current_period_ends_at INTEGER,
            will_renew_at_period_end BOOLEAN,
            num_requests_today INTEGER,
            num_requests_yesterday INTEGER
        )
    ''')
    conn.commit()
    conn.close()

    # Initialize admins.db
    conn = sqlite3.connect(ADMINS_DB)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS admins (
            admin_id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password TEXT
        )
    ''')
    conn.commit()
    conn.close()

init_dbs()

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'admin_logged_in' not in session:
            return redirect(url_for('login_page'))
        return f(*args, **kwargs)
    return decorated_function

@app.route('/')
def index():
    if 'admin_logged_in' in session:
        return redirect(url_for('dashboard'))
    return redirect(url_for('login_page'))

@app.route('/login', methods=['GET'])
def login_page():
    if 'admin_logged_in' in session:
        return redirect(url_for('dashboard'))
    return render_template('login.html')

@app.route('/dashboard')
@login_required
def dashboard():
    return render_template('dashboard.html')

@app.route('/api_keys_page')
@login_required
def api_keys_page():
    return render_template('api_keys.html')

@app.route('/admins_page')
@login_required
def admins_page():
    return render_template('admins.html')

@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    conn = get_admins_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM admins WHERE username = ?', (username,))
    admin = cursor.fetchone()
    conn.close()

    if admin and check_password_hash(admin['password'], password):
        session['admin_logged_in'] = True
        session['admin_username'] = username
        return jsonify({'message': 'Logged in successfully'}), 200
    else:
        return jsonify({'error': 'Invalid credentials'}), 401

@app.route('/logout', methods=['POST'])
@login_required
def logout():
    session.pop('admin_logged_in', None)
    session.pop('admin_username', None)
    return jsonify({'message': 'Logged out successfully'}), 200

# CRUD operations for API keys
@app.route('/api/api_keys', methods=['GET'])
@login_required
def get_api_keys():
    conn = get_api_keys_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM api_keys')
    rows = cursor.fetchall()
    conn.close()

    api_keys = [dict(row) for row in rows]
    return jsonify(api_keys), 200

@app.route('/api/api_keys', methods=['POST'])
@login_required
def create_api_key():
    data = request.get_json()
    user_id = data.get('user_id')
    api_key = data.get('api_key')
    creation_date = data.get('creation_date')
    renewal_date = data.get('renewal_date')
    last_login_at = data.get('last_login_at')
    plan_name = data.get('plan_name')
    max_daily_requests = data.get('max_daily_requests')
    current_period_ends_at = data.get('current_period_ends_at')
    will_renew_at_period_end = data.get('will_renew_at_period_end')
    num_requests_today = data.get('num_requests_today')
    num_requests_yesterday = data.get('num_requests_yesterday')

    conn = get_api_keys_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute('''
            INSERT INTO api_keys (
                user_id, api_key, creation_date, renewal_date, last_login_at,
                plan_name, max_daily_requests, current_period_ends_at,
                will_renew_at_period_end, num_requests_today, num_requests_yesterday
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            user_id,
            api_key,
            creation_date,
            renewal_date,
            last_login_at,
            plan_name,
            max_daily_requests,
            current_period_ends_at,
            will_renew_at_period_end,
            num_requests_today,
            num_requests_yesterday
        ))
        conn.commit()
    except sqlite3.IntegrityError as e:
        conn.close()
        return jsonify({'error': str(e)}), 400
    conn.close()
    return jsonify({'message': 'API key created successfully'}), 201

@app.route('/api/api_keys/<user_id>', methods=['GET'])
@login_required
def get_api_key(user_id):
    conn = get_api_keys_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM api_keys WHERE user_id = ?', (user_id,))
    row = cursor.fetchone()
    conn.close()

    if row is None:
        return jsonify({'error': 'API key not found'}), 404
    else:
        return jsonify(dict(row)), 200

@app.route('/api/api_keys/<user_id>', methods=['PUT'])
@login_required
def update_api_key(user_id):
    data = request.get_json()
    api_key = data.get('api_key')
    creation_date = data.get('creation_date')
    renewal_date = data.get('renewal_date')
    last_login_at = data.get('last_login_at')
    plan_name = data.get('plan_name')
    max_daily_requests = data.get('max_daily_requests')
    current_period_ends_at = data.get('current_period_ends_at')
    will_renew_at_period_end = data.get('will_renew_at_period_end')
    num_requests_today = data.get('num_requests_today')
    num_requests_yesterday = data.get('num_requests_yesterday')

    conn = get_api_keys_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        UPDATE api_keys SET
            api_key = ?,
            creation_date = ?,
            renewal_date = ?,
            last_login_at = ?,
            plan_name = ?,
            max_daily_requests = ?,
            current_period_ends_at = ?,
            will_renew_at_period_end = ?,
            num_requests_today = ?,
            num_requests_yesterday = ?
        WHERE user_id = ?
    ''', (
        api_key,
        creation_date,
        renewal_date,
        last_login_at,
        plan_name,
        max_daily_requests,
        current_period_ends_at,
        will_renew_at_period_end,
        num_requests_today,
        num_requests_yesterday,
        user_id
    ))
    conn.commit()
    conn.close()
    return jsonify({'message': 'API key updated successfully'}), 200

@app.route('/api/api_keys/<user_id>', methods=['DELETE'])
@login_required
def delete_api_key(user_id):
    conn = get_api_keys_db_connection()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM api_keys WHERE user_id = ?', (user_id,))
    conn.commit()
    conn.close()
    return jsonify({'message': 'API key deleted successfully'}), 200

# CRUD operations for Admins
@app.route('/api/admins', methods=['GET'])
@login_required
def get_admins():
    conn = get_admins_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT admin_id, username FROM admins')
    rows = cursor.fetchall()
    conn.close()

    admins = [dict(row) for row in rows]
    return jsonify(admins), 200

@app.route('/api/admins', methods=['POST'])
@login_required
def create_admin():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    password_hash = generate_password_hash(password)

    conn = get_admins_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute('INSERT INTO admins (username, password) VALUES (?, ?)', (username, password_hash))
        conn.commit()
    except sqlite3.IntegrityError as e:
        conn.close()
        return jsonify({'error': str(e)}), 400
    conn.close()
    return jsonify({'message': 'Admin created successfully'}), 201

@app.route('/api/admins/<int:admin_id>', methods=['GET'])
@login_required
def get_admin(admin_id):
    conn = get_admins_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT admin_id, username FROM admins WHERE admin_id = ?', (admin_id,))
    row = cursor.fetchone()
    conn.close()

    if row is None:
        return jsonify({'error': 'Admin not found'}), 404
    else:
        return jsonify(dict(row)), 200

@app.route('/api/admins/<int:admin_id>', methods=['PUT'])
@login_required
def update_admin(admin_id):
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    conn = get_admins_db_connection()
    cursor = conn.cursor()

    if password:
        password_hash = generate_password_hash(password)
        cursor.execute('''
            UPDATE admins SET
                username = ?,
                password = ?
            WHERE admin_id = ?
        ''', (
            username,
            password_hash,
            admin_id
        ))
    else:
        cursor.execute('''
            UPDATE admins SET
                username = ?
            WHERE admin_id = ?
        ''', (
            username,
            admin_id
        ))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Admin updated successfully'}), 200

@app.route('/api/admins/<int:admin_id>', methods=['DELETE'])
@login_required
def delete_admin(admin_id):
    conn = get_admins_db_connection()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM admins WHERE admin_id = ?', (admin_id,))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Admin deleted successfully'}), 200

# CRUD operations for Users
@app.route('/api/users', methods=['GET'])
@login_required
def get_users():
    conn = get_users_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT user, doge, ltc, lky, mint_credits FROM users')
    rows = cursor.fetchall()
    conn.close()

    users = [dict(row) for row in rows]
    return jsonify(users), 200

@app.route('/api/users/<user>', methods=['GET'])
@login_required
def get_user(user):
    conn = get_users_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT user, doge, ltc, lky, mint_credits FROM users WHERE user = ?', (user,))
    row = cursor.fetchone()
    conn.close()

    if row is None:
        return jsonify({'error': 'User not found'}), 404
    else:
        return jsonify(dict(row)), 200

@app.route('/api/users/<user>', methods=['PUT'])
@login_required
def update_user(user):
    data = request.get_json()
    password = data.get('password')
    doge = data.get('doge')
    ltc = data.get('ltc')
    lky = data.get('lky')
    mint_credits = data.get('mint_credits')

    conn = get_users_db_connection()
    cursor = conn.cursor()

    if password:
        hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
        cursor.execute('''
            UPDATE users SET
                password = ?,
                doge = ?,
                ltc = ?,
                lky = ?,
                mint_credits = ?
            WHERE user = ?
        ''', (hashed_password, doge, ltc, lky, mint_credits, user))
    else:
        cursor.execute('''
            UPDATE users SET
                doge = ?,
                ltc = ?,
                lky = ?,
                mint_credits = ?
            WHERE user = ?
        ''', (doge, ltc, lky, mint_credits, user))
    conn.commit()
    conn.close()
    return jsonify({'message': 'User updated successfully'}), 200

@app.route('/api/users', methods=['POST'])
@login_required
def create_user():
    data = request.get_json()
    user = data.get('user')
    password = data.get('password')
    doge = data.get('doge')
    ltc = data.get('ltc')
    lky = data.get('lky')
    mint_credits = data.get('mint_credits', 0)

    # Ensure password is provided
    if not password:
        return jsonify({'error': 'Password is required'}), 400

    hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())

    conn = get_users_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute('''
            INSERT INTO users (user, password, doge, ltc, lky, mint_credits) 
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (user, hashed_password, doge, ltc, lky, mint_credits))
        conn.commit()
    except sqlite3.IntegrityError as e:
        conn.close()
        return jsonify({'error': str(e)}), 400
    conn.close()
    return jsonify({'message': 'User created successfully'}), 201

@app.route('/users_page')
@login_required
def users_page():
    return render_template('users.html')

if __name__ == '__main__':
    app.run(debug=True)