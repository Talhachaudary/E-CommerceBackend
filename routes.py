from flask import request, jsonify, Blueprint,current_app   
from app import db  # ✅ Corrected import to avoid circular import
from models import User, Product, Order, Admin
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from flask import send_from_directory
import os 
from werkzeug.utils import secure_filename

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

    access_token = create_access_token(identity=str(admin.id))
    return jsonify({"message": "Login successful", "access_token": access_token ,"data": {"id": admin.id, "username": admin.username}}), 200

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
@admin_bp.route("/add_product", methods=["POST"])
@jwt_required()
def add_product():
    print("🔹 Step 1: Captured Inputs:", request.form)

    if "img" not in request.files:
        return jsonify({"error": "Image file is required"}), 400

    file = request.files["img"]
    filename = secure_filename(file.filename)

    upload_folder = current_app.config.get("UPLOAD_FOLDER", "uploads")
    filepath = os.path.join(upload_folder, filename)
    file.save(filepath)

    # ✅ Store only the filename in the database, NOT the full path
    data = request.form
    product = Product(
        name=data.get("name", ""),
        category=data.get("category", ""),
        price=float(data.get("price", 0)),
        stock=int(data.get("stock", 0)),
        img=filename,  # ✅ Store only the filename
        description=data.get("description", "")
    )

    db.session.add(product)
    db.session.commit()
    return jsonify({"message": "Product added successfully"}), 201



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
# 🟢 Route to Serve Images
@admin_bp.route('/uploads/<filename>')
def uploaded_file(filename):
    upload_folder = os.path.join(current_app.root_path, "uploads")
    return send_from_directory(upload_folder, filename)


