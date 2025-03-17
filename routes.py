from flask import request, jsonify, Blueprint, current_app, send_from_directory
from app import db
from models import User, Product, Order, Admin, OrderItem
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from flask_cors import CORS 
import os
from werkzeug.utils import secure_filename
from datetime import datetime, timedelta
import json
from sqlalchemy.exc import SQLAlchemyError

admin_bp = Blueprint("admin", __name__, url_prefix="/api/admin")
user_bp = Blueprint("user", __name__, url_prefix="/api/user")
public_bp = Blueprint("public", __name__, url_prefix="/api")
def is_admin():
    try:
        current_admin_id = get_jwt_identity()
        admin = Admin.query.get(current_admin_id)
        return admin is not None
    except Exception:
        return False

def admin_required(f):
    def decorated_function(*args, **kwargs):
        if not is_admin():
            return jsonify({"error": "Admin access required"}), 403
        return f(*args, **kwargs)
    decorated_function.__name__ = f.__name__
    return decorated_function

def get_order_items(order_id):
    """Standardized function to get order items"""
    return OrderItem.query.filter_by(order_id=order_id).all()

@user_bp.route("/user/profile")
def user_profile():
    return "User Profile"

# 🟢 Admin Login
@admin_bp.route("/login", methods=["POST", "OPTIONS"])
def admin_login():
    # Handle OPTIONS request for CORS preflight
    if request.method == "OPTIONS":
        response = jsonify({})
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'POST,OPTIONS')
        response.headers.add('Access-Control-Allow-Origin', 'http://127.0.0.1:5501')
        return response, 200
    
    # Handle normal POST request
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400
            
        username = data.get("username")
        password = data.get("password")
        
        if not username or not password:
            return jsonify({"error": "Username and password are required"}), 400

        admin = Admin.query.filter_by(username=username).first()
        if not admin or not check_password_hash(admin.password, password):
            return jsonify({"error": "Invalid credentials"}), 401

        access_token = create_access_token(identity=str(admin.id))
        return jsonify({
            "message": "Login successful", 
            "access_token": access_token, 
            "data": {"id": admin.id, "username": admin.username}
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

# 🟢 Get All Products
@admin_bp.route("/products", methods=["GET"])
@jwt_required()
@admin_required
def get_products():
    try:
        # Pagination parameters
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        
        # Search parameters
        search = request.args.get('search', '')
        category = request.args.get('category', '')
        
        # Build query
        query = Product.query
        
        if search:
            query = query.filter(Product.name.ilike(f'%{search}%'))
        if category:
            query = query.filter(Product.category == category)
            
        # Execute query with pagination
        paginated_products = query.paginate(page=page, per_page=per_page, error_out=False)
        
        products = [{
            "id": p.id, 
            "name": p.name, 
            "category": p.category, 
            "price": p.price,
            "stock": p.stock, 
            "img": p.img, 
            "description": p.description
        } for p in paginated_products.items]
        
        return jsonify({
            "products": products,
            "total": paginated_products.total,
            "page": page,
            "pages": paginated_products.pages
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
    # 🟢 Daily Sales Analytics
@admin_bp.route("/sales/daily", methods=["GET", "OPTIONS"])
def daily_sales():
    if request.method == "OPTIONS":
        return "", 200
        
    try:
        # Get date parameter or use today
        date_param = request.args.get('date', datetime.now().strftime('%Y-%m-%d'))
        
        # Simple mock data for now
        return jsonify({
            "total_orders": 15,
            "total_revenue": 825.50,
            "top_product": {
                "name": "Sample Product",
                "sales": 350.00
            },
            "hourly_sales": [
                {"hour": "0", "sales": 0},
                {"hour": "8", "sales": 120.50},
                {"hour": "9", "sales": 250.00},
                {"hour": "14", "sales": 180.00},
                {"hour": "18", "sales": 275.00}
            ]
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# 🟢 Monthly Sales Analytics
@admin_bp.route("/sales/monthly", methods=["GET", "OPTIONS"])
def monthly_sales():
    if request.method == "OPTIONS":
        return "", 200
        
    try:
        # Get month parameter or use current month
        month_param = request.args.get('month', datetime.now().strftime('%Y-%m'))
        
        # Simple mock data for now
        return jsonify({
            "total_orders": 120,
            "total_revenue": 6500.75,
            "top_product": {
                "name": "Sample Product",
                "sales": 1200.00
            },
            "daily_sales": [
                {"date": "2025-03-01", "sales": 250.00},
                {"date": "2025-03-02", "sales": 310.25},
                {"date": "2025-03-03", "sales": 0},
                {"date": "2025-03-04", "sales": 425.50}
                # Add more days as needed
            ]
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# 🟢 Yearly Sales Analytics
@admin_bp.route("/sales/yearly", methods=["GET", "OPTIONS"])
def yearly_sales():
    if request.method == "OPTIONS":
        return "", 200
        
    try:
        # Get year parameter or use current year
        year_param = request.args.get('year', datetime.now().strftime('%Y'))
        
        # Simple mock data for now
        return jsonify({
            "total_orders": 1450,
            "total_revenue": 78500.25,
            "top_product": {
                "name": "Sample Product",
                "sales": 15000.00
            },
            "monthly_sales": [
                {"month": "1", "sales": 4500.00, "orders": 85},
                {"month": "2", "sales": 5200.25, "orders": 95},
                {"month": "3", "sales": 6100.00, "orders": 110}
                # Add more months as needed
            ]
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# 🟢 Add Product
@admin_bp.route("/add_product", methods=["POST"])
@jwt_required()
@admin_required
def add_product():
    try:
        print("🔹 Step 1: Captured Inputs:", request.form)
        
        # Validate required fields
        required_fields = ["name", "price", "stock", "category"]
        for field in required_fields:
            if not request.form.get(field):
                return jsonify({"error": f"Field '{field}' is required"}), 400
        
        if "img" not in request.files:
            return jsonify({"error": "Image file is required"}), 400

        # Process image
        file = request.files["img"]
        if file.filename == '':
            return jsonify({"error": "No image file selected"}), 400
            
        filename = secure_filename(file.filename)

        upload_folder = current_app.config.get("UPLOAD_FOLDER", "uploads")
        if not os.path.exists(upload_folder):
            os.makedirs(upload_folder)
        filepath = os.path.join(upload_folder, filename)
        file.save(filepath)

        # Create product with form data
        data = request.form
        product = Product(
            name=data.get("name", ""),
            category=data.get("category", ""),
            price=float(data.get("price", 0)),
            stock=int(data.get("stock", 0)),
            img=filename,
            description=data.get("description", "")
        )

        # Add to database with transaction
        db.session.add(product)
        db.session.commit()
        return jsonify({"message": "Product added successfully", "id": product.id}), 201
    except ValueError as e:
        db.session.rollback()
        return jsonify({"error": f"Invalid value: {str(e)}"}), 400
    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

# 🟢 Delete Product
@admin_bp.route("/delete_product", methods=["DELETE"])
@jwt_required()
@admin_required
def delete_product():
    try:
        product_id = request.json.get("product_id")
        if not product_id:
            return jsonify({"error": "Product ID is required"}), 400
            
        product = Product.query.get(product_id)
        if not product:
            return jsonify({"error": "Product not found"}), 404

        db.session.delete(product)
        db.session.commit()
        return jsonify({"message": "Product deleted successfully"}), 200
    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

# 🟢 Route to Serve Images
@admin_bp.route('/uploads/<filename>')
def uploaded_file(filename):
    try:
        upload_folder = os.path.join(current_app.root_path, "uploads")
        return send_from_directory(upload_folder, filename)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# 🟢 Get Single Product
@admin_bp.route("/product/<int:product_id>", methods=["GET"])
@jwt_required()
@admin_required
def get_product(product_id):
    try:
        product = Product.query.get(product_id)
        if not product:
            return jsonify({"error": "Product not found"}), 404
            
        return jsonify({
            "id": product.id, 
            "name": product.name, 
            "category": product.category, 
            "price": product.price,
            "stock": product.stock, 
            "img": product.img, 
            "description": product.description
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# 🟢 Update Product
@admin_bp.route("/update_product", methods=["PUT"])
@jwt_required()
@admin_required
def update_product():
    try:
        if not request.form:
            return jsonify({"error": "No form data provided"}), 400
            
        product_id = request.form.get("id")
        if not product_id:
            return jsonify({"error": "Product ID is required"}), 400
            
        product = Product.query.get(product_id)
        if not product:
            return jsonify({"error": "Product not found"}), 404
        
        # Update product fields with validation
        if "name" in request.form:
            product.name = request.form.get("name")
        if "category" in request.form:
            product.category = request.form.get("category")
        if "description" in request.form:
            product.description = request.form.get("description")
        if "price" in request.form:
            try:
                product.price = float(request.form.get("price"))
            except ValueError:
                return jsonify({"error": "Price must be a number"}), 400
        if "stock" in request.form:
            try:
                product.stock = int(request.form.get("stock"))
            except ValueError:
                return jsonify({"error": "Stock must be an integer"}), 400
        
        # Handle image upload if provided
        if "img" in request.files:
            file = request.files["img"]
            if file and file.filename:
                filename = secure_filename(file.filename)
                upload_folder = current_app.config.get("UPLOAD_FOLDER", "uploads")
                if not os.path.exists(upload_folder):
                    os.makedirs(upload_folder)
                filepath = os.path.join(upload_folder, filename)
                file.save(filepath)
                product.img = filename
        
        db.session.commit()
        return jsonify({"message": "Product updated successfully"}), 200
    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

# 🟢 Get Orders
@admin_bp.route("/orders", methods=["GET"])
@jwt_required()
@admin_required
def get_orders():
    try:
        # Pagination
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        
        # Query with pagination
        paginated_orders = Order.query.order_by(Order.created_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        result = []
        
        for order in paginated_orders.items:
            user = User.query.get(order.user_id)
            
            # Get order items using OrderItem model
            items = get_order_items(order.id)
            order_items = []
            total = 0
            
            for item in items:
                product = Product.query.get(item.product_id)
                item_total = item.price * item.quantity
                total += item_total
                
                order_items.append({
                    "id": item.id,
                    "product_id": item.product_id,
                    "product_name": product.name if product else "Unknown Product",
                    "quantity": item.quantity,
                    "price": item.price,
                    "total": item_total
                })
            
            result.append({
                "id": order.id,
                "user_id": order.user_id,
                "user_name": user.username if user else "Unknown",
                "email": user.email if user else "Unknown",
                "status": order.status,
                "items": order_items,
                "total": total,
                "created_at": order.created_at.strftime("%Y-%m-%d %H:%M")
            })
        
        return jsonify({
            "orders": result,
            "total": paginated_orders.total,
            "page": page,
            "pages": paginated_orders.pages
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# 🟢 Update Order Status
@admin_bp.route("/order/update", methods=["PUT"])
@jwt_required()
@admin_required
def update_order_status():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400
            
        order_id = data.get("order_id")
        status = data.get("status")
        
        if not order_id or not status:
            return jsonify({"error": "Order ID and status are required"}), 400
            
        # Validate status value
        valid_statuses = ["Pending", "Processing", "Shipped", "Delivered", "Cancelled"]
        if status not in valid_statuses:
            return jsonify({"error": f"Invalid status. Must be one of: {', '.join(valid_statuses)}"}), 400
        
        order = Order.query.get(order_id)
        if not order:
            return jsonify({"error": "Order not found"}), 404
        
        order.status = status
        db.session.commit()
        
        return jsonify({"message": "Order status updated successfully"}), 200
    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

# 🟢 Get Sales Analytics
@admin_bp.route("/sales", methods=["GET"])
@jwt_required()
@admin_required
def get_sales_analytics():
    try:
        period = request.args.get('period', 'month')
        
        # Validate period
        valid_periods = ['day', 'week', 'month', 'year']
        if period not in valid_periods:
            return jsonify({"error": f"Invalid period. Must be one of: {', '.join(valid_periods)}"}), 400
        
        # Get current date
        current_date = datetime.now()
        
        # Set start date based on period
        if period == 'day':
            start_date = current_date.replace(hour=0, minute=0, second=0, microsecond=0)
            group_by = 'hour'
            date_format = '%H:00'
        elif period == 'week':
            start_date = current_date - timedelta(days=7)
            group_by = 'day'
            date_format = '%a'
        elif period == 'month':
            start_date = current_date.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            group_by = 'day'
            date_format = '%d'
        elif period == 'year':
            start_date = current_date.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
            group_by = 'month'
            date_format = '%b'
        
        # Query orders within the period
        orders = Order.query.filter(Order.created_at >= start_date).all()
        
        # Calculate total sales and orders
        total_orders = len(orders)
        total_sales = 0
        
        # Group sales by date
        sales_by_date = {}
        
        # Product sales tracking
        product_sales = {}
        
        for order in orders:
            # Get order items
            items = get_order_items(order.id)
            
            # Calculate order total
            order_total = sum(item.price * item.quantity for item in items)
            total_sales += order_total
            
            # Group by date
            if period == 'day':
                date_key = order.created_at.strftime(date_format)
            elif period == 'week' or period == 'month':
                date_key = order.created_at.strftime(date_format)
            else:  # year
                date_key = order.created_at.strftime(date_format)
                
            if date_key not in sales_by_date:
                sales_by_date[date_key] = {"sales": 0, "orders": 0}
            
            sales_by_date[date_key]["sales"] += order_total
            sales_by_date[date_key]["orders"] += 1
            
            # Track product sales
            for item in items:
                product = Product.query.get(item.product_id)
                if not product:
                    continue
                    
                if product.name not in product_sales:
                    product_sales[product.name] = 0
                product_sales[product.name] += item.price * item.quantity
        
        # Calculate average order value
        average_order_value = total_sales / total_orders if total_orders > 0 else 0
        
        # Format sales by date for chart
        formatted_sales = [
            {"date": date, "sales": data["sales"], "orders": data["orders"]}
            for date, data in sales_by_date.items()
        ]
        
        # Sort by date
        if period == 'day':
            formatted_sales.sort(key=lambda x: int(x["date"].split(':')[0]))
        elif period == 'month':
            formatted_sales.sort(key=lambda x: int(x["date"]))
        
        # Sort products by sales
        top_products = [
            {"name": name, "sales": sales}
            for name, sales in product_sales.items()
        ]
        top_products.sort(key=lambda x: x["sales"], reverse=True)
        top_products = top_products[:5]  # Top 5 products
        
        return jsonify({
            "totalSales": total_sales,
            "totalOrders": total_orders,
            "averageOrderValue": average_order_value,
            "salesByDate": formatted_sales,
            "topProducts": top_products
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# 🟢 Get Dashboard Stats
@admin_bp.route("/dashboard/stats", methods=["GET"])
@jwt_required()
@admin_required
def get_dashboard_stats():
    try:
        # Total products
        total_products = Product.query.count()
        
        # Low stock items (less than 10 items)
        low_stock = Product.query.filter(Product.stock < 10).count()
        
        # Total orders
        total_orders = Order.query.count()
        
        # Total revenue
        orders = Order.query.all()
        total_revenue = 0
        
        for order in orders:
            # Get order items using OrderItem model
            items = get_order_items(order.id)
            order_total = sum(item.price * item.quantity for item in items)
            total_revenue += order_total
        
        # Recent activity (last 5 orders)
        recent_orders = Order.query.order_by(Order.created_at.desc()).limit(5).all()
        recent_activity = []
        
        for order in recent_orders:
            user = User.query.get(order.user_id)
            items = get_order_items(order.id)
            order_total = sum(item.price * item.quantity for item in items)
            
            recent_activity.append({
                "type": "order",
                "id": order.id,
                "user": user.username if user else "Unknown",
                "date": order.created_at.strftime("%Y-%m-%d %H:%M"),
                "status": order.status,
                "amount": order_total
            })
        
        return jsonify({
            "total_products": total_products,
            "low_stock": low_stock,
            "total_orders": total_orders,
            "total_revenue": total_revenue,
            "recent_activity": recent_activity
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# 🟢 Get Categories
@admin_bp.route("/categories", methods=["GET"])
@jwt_required()
def get_categories():
    try:
        # Get distinct categories from products
        categories = db.session.query(Product.category).distinct().all()
        category_list = [category[0] for category in categories]
        
        return jsonify({"categories": category_list}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# 🟢 Admin Profile
@admin_bp.route("/profile", methods=["GET"])
@jwt_required()
@admin_required
def get_admin_profile():
    try:
        admin_id = get_jwt_identity()
        admin = Admin.query.get(admin_id)
        
        if not admin:
            return jsonify({"error": "Admin not found"}), 404
            
        return jsonify({
            "id": admin.id,
            "username": admin.username
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# 🟢 Dashboard Stats - Alias for dashboard/stats
@admin_bp.route("/stats", methods=["GET"])
@jwt_required()
@admin_required
def get_stats():
    # This is just an alias for dashboard/stats to fix the frontend route
    return get_dashboard_stats()

# 🟢 Get Single Order
@admin_bp.route("/orders/<int:order_id>", methods=["GET", "OPTIONS"])
def get_order(order_id):
    # Handle OPTIONS request without authentication
    if request.method == "OPTIONS":
        return "", 200
    
    # For non-OPTIONS requests, manually check authentication
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    if not token:
        return jsonify({"error": "Missing authorization token"}), 401
    
    try:
        # Verify JWT token manually
        from flask_jwt_extended import decode_token
        try:
            decoded = decode_token(token)
            current_admin_id = decoded['sub']
        except Exception as e:
            return jsonify({"error": f"Invalid token: {str(e)}"}), 401
        
        # Check if admin
        admin = Admin.query.get(current_admin_id)
        if not admin:
            return jsonify({"error": "Admin access required"}), 403
        
        # Get order details
        order = Order.query.get(order_id)
        if not order:
            return jsonify({"error": "Order not found"}), 404
            
        user = User.query.get(order.user_id)
        
        # Get order items
        items = get_order_items(order.id)
        order_items = []
        total = 0
        
        for item in items:
            product = Product.query.get(item.product_id)
            item_total = item.price * item.quantity
            total += item_total
            
            order_items.append({
                "id": item.id,
                "product_id": item.product_id,
                "product_name": product.name if product else "Unknown Product",
                "quantity": item.quantity,
                "price": item.price,
                "total": item_total
            })
        
        return jsonify({
            "id": order.id,
            "user_id": order.user_id,
            "user_name": user.username if user else "Unknown",
            "email": user.email if user else "Unknown",
            "status": order.status,
            "items": order_items,
            "total": total,
            "created_at": order.created_at.strftime("%Y-%m-%d %H:%M")
        }), 200
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# 🟢 User Registration
@user_bp.route("/register", methods=["POST", "OPTIONS"])
def user_register():
    if request.method == "OPTIONS":
        return "", 200
        
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        # Extract user data
        username = data.get("username")
        email = data.get("email")
        password = data.get("password")
        
        # Validate required fields
        if not username or not email or not password:
            return jsonify({"error": "Username, email, and password are required"}), 400
        
        # Validate email format
        if '@' not in email or '.' not in email:
            return jsonify({"error": "Invalid email format"}), 400
            
        # Check if username or email already exists
        if User.query.filter_by(username=username).first():
            return jsonify({"error": "Username already exists"}), 400
        
        if User.query.filter_by(email=email).first():
            return jsonify({"error": "Email already exists"}), 400
        
        # Create new user with hashed password
        hashed_password = generate_password_hash(password)
        new_user = User(
            username=username, 
            email=email, 
            password=hashed_password
        )
        
        db.session.add(new_user)
        db.session.commit()
        
        return jsonify({
            "message": "User registered successfully", 
            "user_id": new_user.id
        }), 201
        
    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

# 🟢 User Login
@user_bp.route("/login", methods=["POST"])
def user_login():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        email = data.get("email")
        password = data.get("password")
        
        if not email or not password:
            return jsonify({"error": "Email and password are required"}), 400
        
        # Find user by email
        user = User.query.filter_by(email=email).first()
        if not user or not check_password_hash(user.password, password):
            return jsonify({"error": "Invalid credentials"}), 401
        
        # Generate access token
        access_token = create_access_token(identity=str(user.id))
        
        return jsonify({
            "message": "Login successful",
            "access_token": access_token,
            "user_id": user.id,
            "username": user.username,
            "email": user.email
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# 🟢 User Profile
@user_bp.route("/profile", methods=["GET"])
@jwt_required()
def get_user_profile():
    try:
        # Get user ID from JWT token
        user_id = get_jwt_identity()
        
        # Query user data
        user = User.query.get(user_id)
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        # Return user profile data
        return jsonify({
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "created_at": user.created_at.strftime("%Y-%m-%d %H:%M:%S") if hasattr(user, "created_at") else None
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# 🟢 Get User Orders
@user_bp.route("/orders", methods=["GET"])
@jwt_required()
def get_user_orders():
    try:
        user_id = get_jwt_identity()
        
        # Pagination
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 5, type=int)
        
        # Query user orders
        paginated_orders = Order.query.filter_by(user_id=user_id).order_by(
            Order.created_at.desc()
        ).paginate(page=page, per_page=per_page, error_out=False)
        
        result = []
        
        for order in paginated_orders.items:
            # Get order items
            items = get_order_items(order.id)
            order_items = []
            total = 0
            
            for item in items:
                product = Product.query.get(item.product_id)
                item_total = item.price * item.quantity
                total += item_total
                
                order_items.append({
                    "product_id": item.product_id,
                    "product_name": product.name if product else "Unknown Product",
                    "product_image": product.img if product else None,
                    "quantity": item.quantity,
                    "price": item.price,
                    "total": item_total
                })
            
            result.append({
                "id": order.id,
                "status": order.status,
                "total": total,
                "created_at": order.created_at.strftime("%Y-%m-%d %H:%M"),
                "items": order_items
            })
        
        return jsonify({
            "orders": result,
            "total": paginated_orders.total,
            "page": page,
            "pages": paginated_orders.pages
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# 🟢 Public Products API
@public_bp.route("/products", methods=["GET"])  # Changed from /api/products
def public_products():
    try:
        # Pagination parameters
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 12, type=int)
        
        # Filter parameters
        category = request.args.get('category', '')
        search = request.args.get('search', '')
        sort_by = request.args.get('sort_by', 'id')
        sort_order = request.args.get('sort_order', 'asc')
        
        # Build query
        query = Product.query
        
        # Apply filters
        if category:
            query = query.filter(Product.category == category)
        if search:
            query = query.filter(Product.name.ilike(f'%{search}%'))
        
        # Apply sorting
        if sort_by == 'price':
            query = query.order_by(Product.price.desc() if sort_order == 'desc' else Product.price.asc())
        elif sort_by == 'name':
            query = query.order_by(Product.name.desc() if sort_order == 'desc' else Product.name.asc())
        else:
            query = query.order_by(Product.id.desc() if sort_order == 'desc' else Product.id.asc())
            
        # Execute query with pagination
        paginated_products = query.paginate(page=page, per_page=per_page, error_out=False)
        
        products = [{
            "id": p.id, 
            "name": p.name, 
            "category": p.category, 
            "price": p.price,
            "stock": p.stock, 
            "img": p.img, 
            "description": p.description
        } for p in paginated_products.items]
        
        return jsonify({
            "products": products,
            "total": paginated_products.total,
            "page": page,
            "pages": paginated_products.pages
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# 🟢 Public Categories API
@public_bp.route("/categories", methods=["GET"])  # Changed from /api/categories
def public_categories():
    try:
        # Get distinct categories from products
        categories = db.session.query(Product.category).distinct().all()
        category_list = [category[0] for category in categories]
        
        return jsonify({"categories": category_list}), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# 🟢 Get Single Product (Public)
@public_bp.route("/products/<int:product_id>", methods=["GET"])  # Changed from /api/products/<int:product_id>
def get_public_product(product_id):
    try:
        product = Product.query.get(product_id)
        if not product:
            return jsonify({"error": "Product not found"}), 404
            
        return jsonify({
            "id": product.id, 
            "name": product.name, 
            "category": product.category, 
            "price": product.price,
            "stock": product.stock, 
            "img": product.img, 
            "description": product.description
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Add this under public_bp
@public_bp.route("/orders", methods=["POST"])
@jwt_required()
def create_order():
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        # Validate order items
        items = data.get("items")
        if not items or not isinstance(items, list) or len(items) == 0:
            return jsonify({"error": "Order must contain at least one item"}), 400
        
        # Create new order
        order = Order(
            user_id=user_id,
            status="Pending",
            created_at=datetime.now()
        )
        
        db.session.add(order)
        db.session.flush()  # Get order ID without committing
        
        # Add order items and update product stock
        for item_data in items:
            product_id = item_data.get("product_id")
            quantity = item_data.get("quantity", 1)
            
            if not product_id:
                db.session.rollback()
                return jsonify({"error": "Product ID is required for each item"}), 400
            
            # Get product
            product = Product.query.get(product_id)
            if not product:
                db.session.rollback()
                return jsonify({"error": f"Product with ID {product_id} not found"}), 404
            
            # Check stock
            if product.stock < quantity:
                db.session.rollback()
                return jsonify({"error": f"Not enough stock for {product.name}"}), 400
            
            # Update stock
            product.stock -= quantity
            
            # Create order item
            order_item = OrderItem(
                order_id=order.id,
                product_id=product_id,
                quantity=quantity,
                price=product.price
            )
            
            db.session.add(order_item)
        
        db.session.commit()
        
        return jsonify({
            "message": "Order created successfully",
            "order_id": order.id
        }), 201
        
    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

# Product Reviews API
@public_bp.route("/products/<int:product_id>/reviews", methods=["GET"])
def get_product_reviews(product_id):
    try:
        # Check if product exists
        product = Product.query.get(product_id)
        if not product:
            return jsonify({"error": "Product not found"}), 404
            
        # Get reviews for this product
        # This depends on your database schema
        # Assuming you have a Review model with product_id, user_id, rating, text fields
        reviews = []
        
        # Just return empty list for now until you implement reviews
        return jsonify(reviews), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@public_bp.route("/products/<int:product_id>/reviews", methods=["POST"])
@jwt_required()
def add_product_review(product_id):
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No data provided"}), 400
            
        # Add review logic here when you implement it
        # For now, just return success
        return jsonify({"message": "Review added"}), 201
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# 🟢 Get Single Order (Public/User)
@public_bp.route("/orders/<int:order_id>", methods=["GET", "OPTIONS"])
def get_single_order(order_id):
    # Handle OPTIONS request for CORS preflight
    if request.method == "OPTIONS":
        response = jsonify({})
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'GET,OPTIONS')
        response.headers.add('Access-Control-Allow-Origin', 'http://127.0.0.1:5500')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response, 200
    
    # Regular GET request processing
    try:
        # Get token from request
        token = request.headers.get('Authorization', '')
        if not token or not token.startswith('Bearer '):
            return jsonify({"error": "Missing or invalid token"}), 401
        
        # CRITICAL CHANGE: Don't use JWT-Extended here since it's causing problems
        # Instead, decode the token manually for debugging
        token_str = token.replace('Bearer ', '')
        
        try:
            # Import JWT library for manual decoding
            import jwt
            from app import app  # Import your Flask app to get the secret key
            
            # Manually decode token
            decoded = jwt.decode(
                token_str, 
                app.config['JWT_SECRET_KEY'], 
                algorithms=['HS256']
            )
            
            # Get user_id from decoded token
            user_id = decoded['sub']  # 'sub' is where JWT stores the identity
            print(f"Decoded user_id: {user_id}, type: {type(user_id)}")
            
            # Try to convert user_id to int if it's a string
            if isinstance(user_id, str):
                try:
                    user_id = int(user_id)
                    print(f"Converted user_id to int: {user_id}")
                except ValueError:
                    print(f"Could not convert user_id {user_id} to int")
                
        except Exception as e:
            print(f"Manual JWT decode error: {str(e)}")
            return jsonify({"error": f"Token validation failed: {str(e)}"}), 401
        
        # Get order
        order = Order.query.get(order_id)
        if not order:
            return jsonify({"error": "Order not found"}), 404
            
        # Debug the comparison
        print(f"Order user_id: {order.user_id}, type: {type(order.user_id)}")
        print(f"Token user_id: {user_id}, type: {type(user_id)}")
        
        # Check if order belongs to user or if user is admin
        # Fix type comparison issues by converting to strings
        is_admin = Admin.query.filter_by(user_id=user_id).first() is not None
        is_owner = str(order.user_id) == str(user_id)
        
        print(f"Is admin: {is_admin}, Is owner: {is_owner}")
        
        if not is_owner and not is_admin:
            return jsonify({"error": "Not authorized to view this order"}), 403
        
        # Get order items
        order_items = []
        total = 0
        
        # Get items using OrderItem model
        items = OrderItem.query.filter_by(order_id=order_id).all()
        
        for item in items:
            # Get product details
            product = Product.query.get(item.product_id)
            
            # Calculate item total
            item_total = item.price * item.quantity
            total += item_total
            
            order_items.append({
                "id": item.id,
                "product_id": item.product_id,
                "product_name": product.name if product else "Unknown Product",
                "product_img": product.img if product else None,
                "quantity": item.quantity,
                "price": item.price,
                "total": item_total
            })
        
        # Format created_at date
        created_at_str = order.created_at.strftime("%Y-%m-%d %H:%M:%S") if order.created_at else ""
        
        # Return order details
        return jsonify({
            "id": order.id,
            "user_id": order.user_id,
            "status": order.status,
            "created_at": created_at_str,
            "items": order_items,
            "total": total
        }), 200
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500