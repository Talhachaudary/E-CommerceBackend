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


// 🟢 Add Product
function addProduct() {
    const token = localStorage.getItem("adminToken");
    if (!token) {
        alert("Admin not logged in.");
        return;
    }

    const name = document.getElementById("productName").value.trim();
    const price = parseFloat(document.getElementById("productPrice").value);
    const description = document.getElementById("productDescription").value.trim();
    const stock = parseInt(document.getElementById("productStock").value, 10);
    const category = document.getElementById("productCategory").value.trim();
    const imageFile = document.getElementById("productImg").files[0];

    console.log("🔹 Step 1: Captured Inputs::", { name, price, description, stock, category, imageFile });

    if (!name || !description || !price || !stock || !imageFile) {
        alert("Please fill all fields correctly & select an image file.");
        return;
    }

    // ✅ Check for undefined values before appending
    const formData = new FormData();
    formData.append("name", name);
    formData.append("category", category);
    formData.append("description", description);
    formData.append("price", price);
    formData.append("stock", stock);
    formData.append("img", imageFile);  

    // ✅ Log each formData entry
    console.log("🔹 Step 2: FormData Contents::");
    for (const pair of formData.entries()) {
        console.log(pair[0], pair[1]);
    }

    fetch(`${API_URL}/api/admin/add_product`, { 
        method: "POST",
        headers: {
            "Authorization": `Bearer ${token}`  // ✅ No "Content-Type" for FormData
        },
        body: formData,
    })
    .then(response => {
        console.log("🔹 Step 3: Response status:", response.status);
        return response.json();
    })
    .then(data => {
        console.log("🔹 Step 4: Response data:", data);
        alert(data.message);
        loadProducts();
    })
    .catch(error => {
        console.error("❌ Error adding product:", error);
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
        headers: { 
            "Authorization": `Bearer ${token}`, // ✅ Add Authorization header
            "Content-Type": "application/json"
        }
    })
    .then(response => {
        if (response.status === 401) {
            throw new Error("Unauthorized! Please log in again.");
        }
        return response.json();
    })
    .then(data => {
        console.log("🔹 Products loaded:", data);

        if (!Array.isArray(data)) {
            console.error("❌ Error: Expected an array but got:", data);
            return;
        }

        const productContainer = document.querySelector("#productTable tbody");
        productContainer.innerHTML = ""; // Clear previous products

        data.forEach(product => {
            const productElement = document.createElement("div");
            const imageUrl = `${API_URL}/uploads/${product.img}`;
            productElement.innerHTML = `
                <h3>${product.name}</h3>
                <p>${product.description}</p>
                <p>Price: $${product.price}</p>
                <p>Stock: ${product.stock}</p>
                <img src="${imageUrl}" width="100">
            `;
            productContainer.appendChild(productElement);
        });
    })
    .catch(error => {
        console.error("❌ Error loading products:", error);
        alert(error.message);
    });
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
    //loadOrders();
}
