from flask import request, jsonify, Blueprint
from app import db  # ✅ Corrected import to avoid circular import
from models import User, Product, Order, Admin
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity

admin_bp = Blueprint("admin", __name__, url_prefix="/api/admin")  # ✅ Correct URL prefix
user_bp = Blueprint("user", __name__)

def is_admin():
    current_admin_id = get_jwt_identity()
    admin = Admin.query.get(current_admin_id)
    return admin is not None

@user_bp.route("/user/profile")
def user_profile():
    return "User Profile"

# 🟢 Admin Login
@admin_bp.route('/login', methods=['POST'])
def admin_login():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")

    admin = Admin.query.filter_by(username=username).first()
    if not admin or not check_password_hash(admin.password, password):
        return jsonify({"error": "Invalid credentials"}), 401

    access_token = create_access_token(identity=admin.id)
    return jsonify({"message": "Login successful", "access_token": access_token}), 200

# 🟢 Get All Products
@admin_bp.route("/products", methods=["GET"])
@jwt_required()
def get_products():
    products = Product.query.all()
    return jsonify([{
        "id": p.id, "name": p.name, "category": p.category, "price": p.price,
        "stock": p.stock, "img": p.img, "description": p.description
    } for p in products]), 200

# 🟢 Add Product
@admin_bp.route("/add_product", methods=["POST"])  # ✅ Fixed URL
@jwt_required()
def add_product():
    data = request.json
    print("Received Data:", data)

    if not data or "name" not in data or "price" not in data or "stock" not in data:
        return jsonify({"error": "Missing required fields"}), 400

    category = data.get("category", "Uncategorized")  # Default category

    try:
        product = Product(
            name=data["name"],
            category=category,
            price=float(data["price"]),
            stock=int(data["stock"])
        )
        db.session.add(product)
        db.session.commit()
        print("✅ Product added successfully!")
        return jsonify({"message": "Product added successfully"}), 201
    except Exception as e:
        db.session.rollback()
        print("❌ Error adding product:", e)
        return jsonify({"error": str(e)}), 500

# 🟢 Delete Product
@admin_bp.route("/delete_product", methods=["DELETE"])
@jwt_required()
def delete_product():
    if not is_admin():
        return jsonify({"message": "Unauthorized"}), 403

    product_id = request.json.get("product_id")
    product = Product.query.get(product_id)
    if not product:
        return jsonify({"message": "Product not found"}), 404

    db.session.delete(product)
    db.session.commit()
    return jsonify({"message": "Product deleted successfully"}), 200
