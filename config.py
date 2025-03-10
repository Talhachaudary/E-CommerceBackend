import os

class Config:
    SECRET_KEY = "your_secret_key_here"
    SQLALCHEMY_DATABASE_URI = "mysql+pymysql://root@localhost/ecommerce_db"  # Add password if needed
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = "your_jwt_secret_key_here"  # ✅ Fixed missing quote
    UPLOAD_FOLDER = "uploads"


