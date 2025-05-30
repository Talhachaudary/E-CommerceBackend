from app import db
from datetime import datetime
from werkzeug.security import generate_password_hash

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)

class Product(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    category = db.Column(db.String(50), nullable=False)
    price = db.Column(db.Float, nullable=False)
    img = db.Column(db.String(255), nullable=True)
    stock = db.Column(db.Integer, nullable=False)
    rating = db.Column(db.Float, nullable=True)
    description = db.Column(db.Text, nullable=True)




class Order(db.Model):
    id = db.Column()
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    total = db.Column()  # Renamed from total_price
    status = db.Column(db.String(20), default="Pending")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Add relationship to User
    user = db.relationship('User', backref='orders')

class OrderItem(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey('order.id'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('product.id'), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    price = db.Column(db.Float, nullable=False)  # Price at time of purchase
    
    # Relationships for easy access
    product = db.relationship('Product', backref='order_items')
    order = db.relationship('Order', backref='items')

class Admin(db.Model):
    id = db.Column(db.Integer, primary_key=True)
   
    password = db.Column(db.String(255), nullable=False)  # Hashed Password

# Function to create default admin (run once)
def create_admin():
    if not Admin.query.first():
        hashed_password = generate_password_hash("admin123", method="pbkdf2:sha256")
        admin = Admin(username="admin", password=hashed_password)
        db.session.add(admin)
        db.session.commit()
