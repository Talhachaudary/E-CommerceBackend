from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from flask_migrate import Migrate
from config import Config
import logging
import os

# Configure logging for debugging
logging.basicConfig(level=logging.DEBUG)

# Initialize Flask App
app = Flask(__name__)
app.config.from_object(Config)

# Define Upload Folder
UPLOAD_FOLDER = os.path.join(os.getcwd(), "uploads")
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER

# Ensure uploads folder exists
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

# Enable CORS
CORS(app)

# Initialize Extensions
db = SQLAlchemy(app)
migrate = Migrate(app, db)
jwt = JWTManager(app)

# Import and Register Blueprints
try:
    from routes import admin_bp, user_bp
    app.register_blueprint(admin_bp, url_prefix="/api/admin")  # ✅ Fixed URL prefix
    app.register_blueprint(user_bp, url_prefix="/api/user")
except ImportError as e:
    logging.error(f"Error importing blueprints: {e}")

# Run the application
if __name__ == "__main__":
    with app.app_context():
        db.create_all()
    app.run(debug=True)