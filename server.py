from flask import Flask, jsonify, send_from_directory, request
import random
import os

app = Flask(__name__, static_folder='.')

QUESTIONS_PER_MODULE = 10
TIME_PER_QUESTION_SEC = 10

# Define modules and Python generators
def gen_add_1_100():
    a = random.randint(1, 100)
    b = random.randint(1, 100)
    return { 'text': f"{a} + {b} = ?", 'answer': str(a + b) }

# Register modules: id, title, generator function
MODULES = [
    { 'id': 'addition_1_100', 'title': 'Add numbers (1 to 100)', 'generator': gen_add_1_100 }
]

def find_module(module_id):
    for m in MODULES:
        if m['id'] == module_id:
            return m
    return None

@app.route('/api/modules')
def api_modules():
    return jsonify([
        { 'id': m['id'], 'title': m['title'], 'questions': QUESTIONS_PER_MODULE, 'time_per_question': TIME_PER_QUESTION_SEC }
        for m in MODULES
    ])

@app.route('/api/question')
def api_question():
    module_id = request.args.get('module_id')
    if not module_id:
        return jsonify({ 'error': 'module_id required' }), 400
    m = find_module(module_id)
    if not m:
        return jsonify({ 'error': 'unknown module' }), 404
    q = m['generator']()
    # return question including the answer (frontend will use it to check correctness)
    return jsonify(q)

# Serve the static files (index.html, app.js, styles.css)
@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:filename>')
def static_files(filename):
    # serve files from the project root (for this simple demo)
    if os.path.exists(filename):
        return send_from_directory('.', filename)
    return ('', 404)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000, debug=True)
