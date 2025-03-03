const API_URL = "http://localhost:5000"; // Update with your backend URL

// 🟢 Admin Login
function adminLogin() {
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    fetch(`${API_URL}/api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
    })
    .then(response => response.json())
    .then(data => {
        if (data.access_token) {
            localStorage.setItem("adminToken", data.access_token);
            window.location.href = "dashboard.html";
        } else {
            document.getElementById("error-message").innerText = "Invalid credentials!";
        }
    })
    .catch(err => console.error("Login failed", err));
}

// 🟢 Logout
function logout() {
    localStorage.removeItem("adminToken");
    window.location.href = "index.html";
}

// 🟢 Fetch and Display Products
function loadProducts() {
    console.log("line 33:: ", localStorage.getItem("adminToken"));
    fetch(`${API_URL}/api/admin/products`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("adminToken")}` }
    })
    .then(response => response.json())
    .then(products => {
        const productTable = document.querySelector("#productTable tbody");
        productTable.innerHTML = "";
        products.forEach(p => {
            productTable.innerHTML += `
                <tr>
                    <td>${p.id}</td><td>${p.name}</td><td>$${p.price}</td>
                    <td><button onclick="deleteProduct(${p.id})">Delete</button></td>
                </tr>
            `;
        });
    })
    .catch(err => console.error("Failed to load products", err));
}

// 🟢 Add Product
function addProduct() {
    const token = localStorage.getItem("adminToken");
    if (!token) {
        alert("Admin not logged in.");
        return;
    }

    const name = document.getElementById("product-name").value.trim();
    const price = parseFloat(document.getElementById("product-price").value);
    const description = document.getElementById("product-description").value.trim();
    const stock = parseInt(document.getElementById("product-stock").value, 10);
    const category = document.getElementById("product-category").value.trim();
    const img = document.getElementById("product-img").value.trim();

    if (!name || !category || isNaN(price) || isNaN(stock)) {
        alert("Please fill all fields correctly.");
        return;
    }

    fetch(`${API_URL}/api/admin/add_product`, { 
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ name, category, description, price, stock, img })
    })
    .then(response => response.json())
    .then(data => {
        alert(data.message);
        loadProducts();
    })
    .catch(error => {
        console.error("Error adding product:", error);
        alert("Failed to add product.");
    });
}

// 🟢 Load Products
function loadProducts() {
    const token = localStorage.getItem("adminToken");
    if (!token) {
        alert("Admin not logged in.");
        return;
    }

    fetch(`${API_URL}/api/admin/products`, {
        method: "GET",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        }
    })
    .then(response => response.json())
    .then(products => {
        console.log("Products loaded:", products);
        const productTable = document.querySelector("#productTable tbody");
        productTable.innerHTML = "";
        products && products?.forEach(p => {
            productTable.innerHTML += `
                <tr>
                    <td>${p.id}</td><td>${p.name}</td><td>$${p.price}</td>
                    <td><button onclick="deleteProduct(${p.id})">Delete</button></td>
                </tr>
            `;
        });
        alert("Products loaded successfully! Check console.");
    })
    .catch(error => console.error("Error loading products:", error));
}

// 🟢 Delete Product
function deleteProduct(id) {
    fetch(`${API_URL}/api/admin/delete_product`, {
        method: "DELETE",
        headers: { 
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("adminToken")}`
        },
        body: JSON.stringify({ product_id: id })
    })
    .then(response => response.json())
    .then(data => {
        alert(data.message);
        loadProducts();
    })
    .catch(err => console.error("Failed to delete product", err));
}



// 🟢 Update Order Status
function updateOrderStatus(id) {
    fetch(`${API_URL}/api/admin/order/update`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("adminToken")}`
        },
        body: JSON.stringify({ order_id: id, status: "Completed" })
    })
    .then(response => response.json())
    .then(data => {
        alert(data.message);
        loadOrders();
    })
    .catch(err => console.error("Failed to update order", err));
}

// 🟢 Load Data on Dashboard
if (window.location.pathname.includes("dashboard.html")) {
    loadProducts();
    loadOrders();
}
