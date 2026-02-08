from flask import Flask, request, jsonify, send_from_directory
import sqlite3
import json
import os
import random

app = Flask(__name__, static_folder='static')
DB_FILE = 'mellmap.db'

def init_db():
    if not os.path.exists(DB_FILE):
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        cursor.execute('''
            CREATE TABLE places (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                district TEXT NOT NULL,
                category TEXT NOT NULL,
                breakfast_time TEXT NOT NULL,
                breakfast_hours TEXT,
                lat REAL NOT NULL,
                lng REAL NOT NULL,
                address TEXT NOT NULL,
                website TEXT,
                price TEXT NOT NULL,
                rating REAL NOT NULL,
                description TEXT,
                photos TEXT NOT NULL DEFAULT '[]'
            )
        ''')
        conn.commit()
        conn.close()

def dict_factory(cursor, row):
    d = {}
    for idx, col in enumerate(cursor.description):
        d[col[0]] = row[idx]
    return d

def load_places():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = dict_factory
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM places')
    rows = cursor.fetchall()
    conn.close()
    for row in rows:
        try:
            if row['photos'] and row['photos'].strip() not in ('null', ''):
                row['photos'] = json.loads(row['photos'])
            else:
                row['photos'] = []
        except:
            row['photos'] = []
    return rows

@app.route('/')
def index():
    return send_from_directory('static', 'main_page.html')

@app.route('/admin')
def admin():
    return send_from_directory('static', 'admin.html')

# 🔥 СПЕЦИФИЧНЫЕ РОУТЫ — СНАЧАЛА!
@app.route('/api/places/random', methods=['GET'])
def get_random_places():
    count = request.args.get('count', default=3, type=int)
    places = load_places()
    if len(places) <= count:
        selected = places
    else:
        selected = random.sample(places, count)
    simplified = [{
        'id': p['id'],
        'name': p['name'],
        'district': p['district'],
        'category': p['category'],
        'breakfast_time': p['breakfast_time'],
        'breakfast_hours': p.get('breakfast_hours'),
        'price': p['price'],
        'rating': p['rating'],
        'photos': p['photos']
    } for p in selected]
    return jsonify(simplified)

@app.route('/api/places/random-match', methods=['GET'])
def get_random_matching_place():
    try:
        district = request.args.get('district')
        category = request.args.get('category')
        breakfast_time = request.args.get('breakfast_time')
        max_price = request.args.get('max_price', type=int)
        min_rating = request.args.get('min_rating', type=float)

        places = load_places()
        filtered = []

        for p in places:
            if district and p.get('district') != district:
                continue
            if category and p.get('category') != category:
                continue
            if breakfast_time and p.get('breakfast_time') != breakfast_time:
                continue
            if max_price is not None:
                try:
                    clean_price = p.get('price', '0').replace('₽', '').replace(' ', '').strip()
                    price_val = int(clean_price) if clean_price.isdigit() else 999999
                    if price_val > max_price:
                        continue
                except:
                    continue
            if min_rating is not None and p.get('rating', 0) < min_rating:
                continue
            filtered.append(p)

        if not filtered:
            return jsonify({'error': 'Не найдено подходящих заведений'}), 404

        selected = random.choice(filtered)
        return jsonify(selected)

    except Exception as e:
        print("Ошибка в random-match:", str(e))
        return jsonify({'error': 'Внутренняя ошибка сервера'}), 500

# Общие роуты — ПОСЛЕ специфичных
@app.route('/api/places/<int:place_id>', methods=['PUT'])
def update_place_api(place_id):
    data = request.json
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute('''
        UPDATE places SET
        name = ?, district = ?, category = ?, breakfast_time = ?, breakfast_hours = ?,
        lat = ?, lng = ?, address = ?, website = ?, price = ?, rating = ?, description = ?, photos = ?
        WHERE id = ?
    ''', (
        data['name'],
        data['district'],
        data['category'],
        data['breakfast_time'],
        data.get('breakfast_hours'),
        data['lat'],
        data['lng'],
        data['address'],
        data.get('website'),
        data['price'],
        data['rating'],
        data.get('description', ''),
        json.dumps(data.get('photos', [])),
        place_id
    ))
    conn.commit()
    conn.close()
    return jsonify({'status': 'ok'})

@app.route('/api/places/<int:place_id>', methods=['DELETE'])
def delete_place_api(place_id):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute('DELETE FROM places WHERE id = ?', (place_id,))
    conn.commit()
    conn.close()
    return jsonify({'status': 'ok'})

@app.route('/api/places', methods=['GET'])
def get_places():
    return jsonify(load_places())

@app.route('/api/places', methods=['POST'])
def add_place_api():
    data = request.json
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO places 
        (name, district, category, breakfast_time, breakfast_hours, lat, lng, address, website, price, rating, description, photos)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        data['name'],
        data['district'],
        data['category'],
        data['breakfast_time'],
        data.get('breakfast_hours'),
        data['lat'],
        data['lng'],
        data['address'],
        data.get('website'),
        data['price'],
        data['rating'],
        data.get('description', ''),
        json.dumps(data.get('photos', []))
    ))
    conn.commit()
    conn.close()
    return jsonify({'status': 'ok'})

@app.route('/<path:path>')
def static_files(path):
    try:
        return send_from_directory('static', path)
    except FileNotFoundError:
        return "Файл не найден", 404

if __name__ == '__main__':
    init_db()
    print("\n✅ Сервер запущен!")
    print("Главная:      http://localhost:5000")
    print("Админка:     http://localhost:5000/admin")
    print("База данных: mellmap.db\n")
    app.run(host='0.0.0.0', port=5000, debug=True)