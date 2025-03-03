from app import app, db
from models import Admin
from werkzeug.security import generate_password_hash

# Ensure we are inside an application context
with app.app_context():
    admin = Admin(username="admin", password=generate_password_hash("admin123"))
    db.session.add(admin)
    db.session.commit()

    print("Admin user created successfully!")
