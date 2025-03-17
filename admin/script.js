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
        showNotification(data.message, "success");
        loadProducts();
        // Clear form
        document.getElementById("addProductForm").reset();
    })
    .catch(error => {
        console.error("❌ Error adding product:", error);
        showNotification("Failed to add product.", "error");
    });
}

// 🟢 Load Products
function loadProducts(page = 1, searchTerm = "", category = "") {
    const token = localStorage.getItem("adminToken");
    if (!token) {
        alert("Admin not logged in.");
        return;
    }

    // Build query parameters
    let queryParams = `page=${page}`;
    if (searchTerm) queryParams += `&search=${encodeURIComponent(searchTerm)}`;
    if (category) queryParams += `&category=${encodeURIComponent(category)}`;

    fetch(`${API_URL}/api/admin/products?${queryParams}`, {
        headers: { 
            "Authorization": `Bearer ${token}`, 
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

        if (!Array.isArray(data.products)) {
            console.error("❌ Error: Expected an array but got:", data);
            return;
        }

        const productContainer = document.querySelector("#productTable tbody");
        productContainer.innerHTML = ""; // Clear previous products

        if (data.products.length === 0) {
            productContainer.innerHTML = `
                <tr>
                    <td colspan="4" class="no-data">No products found</td>
                </tr>
            `;
            return;
        }

        data.products.forEach(product => {
            const imageUrl = `${API_URL}/api/admin/uploads/${product.img}`;
            
            // Create table row
            const row = document.createElement("tr");
            
            row.innerHTML = `
                <td>${product.id}</td>
                <td>
                    <strong>${product.name}</strong>
                    <p><small>${product.category}</small></p>
                    <img src="${imageUrl}" width="60" alt="${product.name}" onerror="this.src='placeholder.jpg'">
                </td>
                <td>$${product.price.toFixed(2)}</td>
                <td class="stock-column ${product.stock < 10 ? 'low-stock' : ''}">
                    ${product.stock} ${product.stock < 10 ? '⚠️' : ''}
                </td>
                <td>
                    <button onclick="editProduct(${product.id})" class="edit-btn">Edit</button>
                    <button onclick="confirmDelete(${product.id}, '${product.name}')" class="delete-btn">Delete</button>
                </td>
            `;
            
            productContainer.appendChild(row);
        });

        // Update pagination
        renderPagination(data.total, data.page, data.pages, 'productPagination', loadProducts);

        // Update categories filter if needed
        if (!document.getElementById("categoryFilter").hasChildNodes()) {
            loadCategories();
        }
    })
    .catch(error => {
        console.error("❌ Error loading products:", error);
        showNotification(error.message, "error");
    });
}

// 🟢 Delete Product with Confirmation
function confirmDelete(id, name) {
    if (confirm(`Are you sure you want to delete "${name}"?`)) {
        deleteProduct(id);
    }
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
        showNotification(data.message, "success");
        loadProducts();
        loadDashboardStats(); // Refresh stats after deletion
    })
    .catch(err => {
        console.error("Failed to delete product", err);
        showNotification("Failed to delete product.", "error");
    });
}

// 🟢 Update Order Status
function updateOrderStatus(id, status) {
    fetch(`${API_URL}/api/admin/order/update`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("adminToken")}`
        },
        body: JSON.stringify({ order_id: id, status: status })
    })
    .then(response => response.json())
    .then(data => {
        showNotification(data.message, "success");
        loadOrders();
        loadDashboardStats(); // Refresh stats after update
    })
    .catch(err => {
        console.error("Failed to update order", err);
        showNotification("Failed to update order status.", "error");
    });
}

// 🟢 Edit Product - Opens modal with product data
function editProduct(id) {
    const token = localStorage.getItem("adminToken");
    if (!token) {
        alert("Admin not logged in.");
        return;
    }
    
    // Show the modal first to ensure elements are accessible
    const modal = document.getElementById("editProductModal");
    modal.style.display = "block";
    
    // Get product details
    fetch(`${API_URL}/api/admin/product/${id}`, {
        headers: { 
            "Authorization": `Bearer ${token}`, 
            "Content-Type": "application/json"
        }
    })
    .then(response => response.json())
    .then(product => {
        // Fill the edit form
        document.getElementById("editProductId").value = product.id;
        document.getElementById("editProductName").value = product.name;
        document.getElementById("editProductPrice").value = product.price;
        document.getElementById("editProductDescription").value = product.description;
        document.getElementById("editProductStock").value = product.stock;
        document.getElementById("editProductCategory").value = product.category;
        
        // Show current image
        const imageUrl = `${API_URL}/api/admin/uploads/${product.img}`;
        document.getElementById("currentProductImage").src = imageUrl;
        document.getElementById("currentImageName").textContent = product.img;
        
        // Show the modal
        document.getElementById("editProductModal").style.display = "block";
    })
    .catch(error => {
        console.error("❌ Error loading product details:", error);
        showNotification("Failed to load product details.", "error");
    });
}

// 🟢 Update Product - Handles form submission
function updateProduct() {
    const token = localStorage.getItem("adminToken");
    if (!token) {
        alert("Admin not logged in.");
        return;
    }
    
    const id = document.getElementById("editProductId").value;
    const name = document.getElementById("editProductName").value.trim();
    const price = parseFloat(document.getElementById("editProductPrice").value);
    const description = document.getElementById("editProductDescription").value.trim();
    const stock = parseInt(document.getElementById("editProductStock").value, 10);
    const category = document.getElementById("editProductCategory").value.trim();
    const imageFile = document.getElementById("editProductImg").files[0]; // Optional
    
    if (!name || !description || isNaN(price) || isNaN(stock) || !category) {
        showNotification("Please fill all required fields correctly.", "error");
        return;
    }
    
    // Create FormData object
    const formData = new FormData();
    formData.append("id", id);
    formData.append("name", name);
    formData.append("category", category);
    formData.append("description", description);
    formData.append("price", price);
    formData.append("stock", stock);
    
    // Only append image if a new one is selected
    if (imageFile) {
        formData.append("img", imageFile);
    }
    
    // Update product via API
    fetch(`${API_URL}/api/admin/update_product`, {
        method: "PUT",
        headers: {
            "Authorization": `Bearer ${token}`
        },
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        showNotification(data.message, "success");
        document.getElementById("editProductModal").style.display = "none";
        loadProducts(); // Reload products list
        loadDashboardStats(); // Refresh stats after update
    })
    .catch(error => {
        console.error("❌ Error updating product:", error);
        showNotification("Failed to update product.", "error");
    });
}

// 🟢 Load Categories
function loadCategories() {
    const token = localStorage.getItem("adminToken");
    if (!token) return;

    fetch(`${API_URL}/api/admin/categories`, {
        headers: { 
            "Authorization": `Bearer ${token}`, 
            "Content-Type": "application/json"
        }
    })
    .then(response => response.json())
    .then(categories => {
        const categorySelect = document.getElementById("categoryFilter");
        // Keep the "All Categories" option
        categorySelect.innerHTML = '<option value="">All Categories</option>';
        
        categories.forEach(category => {
            const option = document.createElement("option");
            option.value = category;
            option.textContent = category;
            categorySelect.appendChild(option);
        });
    })
    .catch(error => console.error("❌ Error loading categories:", error));
}

// 🟢 Load Dashboard Stats
function loadDashboardStats() {
    const token = localStorage.getItem("adminToken");
    if (!token) return;
    
    console.log("Loading dashboard stats...");

    // Show loading state
    document.getElementById("totalProducts").textContent = "Loading...";
    document.getElementById("totalOrders").textContent = "Loading...";
    document.getElementById("totalRevenue").textContent = "Loading...";
    document.getElementById("lowStockItems").textContent = "Loading...";
    document.getElementById("recentActivityList").innerHTML = "<div class='loading'>Loading...</div>";

    fetch(`${API_URL}/api/admin/dashboard/stats`, {  // Use the full path
        headers: { 
            "Authorization": `Bearer ${token}`, 
            "Content-Type": "application/json"
        }
    })
    .then(response => {
        if (!response.ok) throw new Error(`Server error: ${response.status}`);
        return response.json();
    })
    .then(data => {
        console.log("Dashboard stats loaded:", data);
        
        // Use the snake_case property names from the backend
        document.getElementById("totalProducts").textContent = data.total_products || 0;
        document.getElementById("totalOrders").textContent = data.total_orders || 0;
        
        // Handle revenue safely
        const revenue = parseFloat(data.total_revenue || 0);
        document.getElementById("totalRevenue").textContent = `$${revenue.toFixed(2)}`;
        
        document.getElementById("lowStockItems").textContent = data.low_stock || 0;
        
        // Update recent activity
        const activityList = document.getElementById("recentActivityList");
        activityList.innerHTML = "";
        
        if (data.recent_activity && data.recent_activity.length > 0) {
            data.recent_activity.forEach(activity => {
                const item = document.createElement("div");
                item.className = "activity-item";
                
                // Format the activity based on its type
                let activityText = '';
                if (activity.type === 'order') {
                    activityText = `Order #${activity.id} by ${activity.user || 'Unknown'} - ${activity.status} ($${parseFloat(activity.amount || 0).toFixed(2)})`;
                } else {
                    activityText = activity.action || 'Unknown activity';
                }
                
                item.innerHTML = `
                    <span class="activity-time">${activity.date || 'Unknown date'}</span>
                    <span class="activity-text">${activityText}</span>
                `;
                activityList.appendChild(item);
            });
        } else {
            activityList.innerHTML = "<div class='no-activity'>No recent activity</div>";
        }
    })
    .catch(error => {
        console.error("❌ Error loading dashboard stats:", error);
        
        // Show error state
        document.getElementById("totalProducts").textContent = "Error";
        document.getElementById("totalOrders").textContent = "Error";
        document.getElementById("totalRevenue").textContent = "Error";
        document.getElementById("lowStockItems").textContent = "Error";
        
        document.getElementById("recentActivityList").innerHTML = 
            "<div class='error'>Failed to load recent activity</div>";
    });
}

// 🟢 Load Orders with Pagination
function loadOrders(page = 1, status = "") {
    const token = localStorage.getItem("adminToken");
    if (!token) {
        alert("Admin not logged in.");
        return;
    }

    // Build query parameters
    let queryParams = `page=${page}`;
    if (status) queryParams += `&status=${encodeURIComponent(status)}`;

    fetch(`${API_URL}/api/admin/orders?${queryParams}`, {
        headers: { 
            "Authorization": `Bearer ${token}`, 
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
        const ordersContainer = document.querySelector("#orderTable tbody");
        ordersContainer.innerHTML = ""; // Clear previous orders

        if (data.orders.length === 0) {
            ordersContainer.innerHTML = `
                <tr>
                    <td colspan="5" class="no-data">No orders found</td>
                </tr>
            `;
            return;
        }

        data.orders.forEach(order => {
            const statusClass = getStatusClass(order.status);
            const row = document.createElement("tr");
            
            row.innerHTML = `
                <td>${order.id}</td>
                <td>${order.customer_name}</td>
                <td>$${order.total.toFixed(2)}</td>
                <td>
                    <span class="status-badge ${statusClass}">${order.status}</span>
                </td>
                <td>${formatDate(order.created_at)}</td>
                <td>
                    <button onclick="viewOrderDetails(${order.id})" class="view-btn">View</button>
                    ${getStatusButtons(order)}
                </td>
            `;
            
            ordersContainer.appendChild(row);
        });

        // Update pagination
        renderPagination(data.total, data.page, data.pages, 'orderPagination', loadOrders);
    })
    .catch(error => {
        console.error("❌ Error loading orders:", error);
        showNotification(error.message, "error");
    });
}

// 🟢 View Order Details
function viewOrderDetails(orderId) {
    const token = localStorage.getItem("adminToken");
    if (!token) return;
    
    // Stop event propagation if event exists
    if (event) event.stopPropagation();
    
    console.log("🔍 View Order:", orderId); 
    
    // 1. Get modal elements
    const modal = document.getElementById("orderDetailsModal");
    const orderDetailsContent = document.getElementById("orderDetailsContent");
    
    // 2. Validate modal exists
    if (!modal) {
        console.error("Modal element not found! ID: orderDetailsModal");
        alert("Error: Modal element not found!");
        return;
    }
    
    if (!orderDetailsContent) {
        console.error("Modal content element not found! ID: orderDetailsContent");
        alert("Error: Modal content element not found!");
        return;
    }
    
    // 3. Force modal display properties
    modal.style.display = "block";
    modal.style.opacity = "1";
    modal.style.pointerEvents = "auto";
    modal.style.zIndex = "9999";
    
    // 4. Show loading indicator
    orderDetailsContent.innerHTML = `
        <div class="loading" style="text-align:center; padding:30px;">
            <div style="border:5px solid #f3f3f3; border-top:5px solid #3498db; border-radius:50%; width:50px; height:50px; margin:0 auto 20px; animation:spin 1s linear infinite;"></div>
            <p>Loading order details...</p>
        </div>
    `;
    
    // Define animation if needed
    if (!document.getElementById('spinKeyframes')) {
        const style = document.createElement('style');
        style.id = 'spinKeyframes';
        style.textContent = '@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }';
        document.head.appendChild(style);
    }
    
    // 5. Add manual close button behavior
    const closeBtn = modal.querySelector(".close");
    if (closeBtn) {
        closeBtn.onclick = function() {
            modal.style.display = "none";
        };
    }
    
    // 6. Fetch order data
    fetch(`${API_URL}/api/admin/orders/${orderId}`, {
        headers: { 
            "Authorization": `Bearer ${token}`, 
            "Content-Type": "application/json"
        }
    })
    .then(response => {
        if (!response.ok) throw new Error(`Server error: ${response.status}`);
        return response.json();
    })
    .then(order => {
        console.log("📦 Order loaded:", order);
        
        // Make sure the modal is still shown
        modal.style.display = "block";
        
        // Build the HTML content
        let itemsHtml = order.items.map(item => `
            <div class="order-item" style="display:flex; justify-content:space-between; margin-bottom:10px; padding:8px; border-bottom:1px solid #eee;">
                <div class="item-info">
                    <strong>${item.product_name}</strong> × ${item.quantity}
                </div>
                <div class="item-price">$${(item.price * item.quantity).toFixed(2)}</div>
            </div>
        `).join('');
        
        // Update the modal content
        orderDetailsContent.innerHTML = `
            <div class="order-details" style="font-size:16px;">
                <p><strong>Customer:</strong> ${order.user_name || "Unknown"}</p>
                <p><strong>Email:</strong> ${order.email || "Not provided"}</p>
                <p><strong>Date:</strong> ${order.created_at || "Unknown date"}</p>
                <p><strong>Status:</strong> <span class="status-badge ${getStatusClass(order.status)}">${order.status}</span></p>
                
                <div class="order-items" style="margin-top:20px; border:1px solid #ddd; padding:15px; border-radius:5px;">
                    <h4 style="margin-top:0;">Items</h4>
                    ${itemsHtml}
                </div>
                
                <div class="order-summary" style="margin-top:20px; text-align:right;">
                    <div class="summary-row total" style="font-size:18px; font-weight:bold; margin-bottom:15px;">
                        <span>Total:</span>
                        <span>$${order.total?.toFixed(2) || "0.00"}</span>
                    </div>
                    
                    <div class="action-buttons" style="display:flex; justify-content:flex-end; gap:10px;">
                        ${getStatusButtons(order)}
                    </div>
                </div>
            </div>
        `;
        
        // Reattach close button event again (just to be safe)
        document.querySelectorAll(`#orderDetailsModal .close`).forEach(btn => {
            btn.onclick = function() {
                modal.style.display = "none";
            };
        });
    })
    .catch(error => {
        console.error("❌ Error loading order details:", error);
        orderDetailsContent.innerHTML = `
            <div style="color:red; text-align:center; padding:20px;">
                <h4>Error Loading Order</h4>
                <p>${error.message}</p>
                <button onclick="modal.style.display='none'" style="margin-top:15px; padding:8px 16px;">Close</button>
            </div>
        `;
    });
    
    // Prevent click events inside modal from closing it
    modal.querySelector('.modal-content').addEventListener('click', event => {
        event.stopPropagation();
    });
    
    // Make sure the modal stays visible - delayed check
    setTimeout(() => {
        if (modal.style.display !== "block") {
            console.log("Re-showing modal after timeout");
            modal.style.display = "block";
        }
    }, 500);
}

// Add this function if it doesn't exist
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.style.position = 'fixed';
    notification.style.top = '20px';
    notification.style.right = '20px';
    notification.style.padding = '10px 20px';
    notification.style.borderRadius = '4px';
    notification.style.fontSize = '16px';
    notification.style.zIndex = '10000';
    
    // Set color based on type
    if (type === 'error') {
        notification.style.backgroundColor = '#f44336';
    } else if (type === 'success') {
        notification.style.backgroundColor = '#4caf50';
    } else {
        notification.style.backgroundColor = '#2196f3';
    }
    
    notification.style.color = 'white';
    notification.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.5s';
        setTimeout(() => notification.remove(), 500);
    }, 5000);
}
// 🟢 Load Sales Analytics
function loadSalesAnalytics(period = 'month') {
    const token = localStorage.getItem("adminToken");
    if (!token) return;

    fetch(`${API_URL}/api/admin/sales?period=${period}`, {
        headers: { 
            "Authorization": `Bearer ${token}`, 
            "Content-Type": "application/json"
        }
    })
    .then(response => response.json())
    .then(data => {
        // Get the correct elements based on the period
        const totalOrdersId = `${period}TotalOrders`; 
        const totalRevenueId = `${period}TotalRevenue`;
        const topProductId = `${period}TopProduct`;
        
        const ordersElement = document.getElementById(totalOrdersId);
        const revenueElement = document.getElementById(totalRevenueId);
        const topProductElement = document.getElementById(topProductId);
        
        // Update elements if they exist
        if (ordersElement) {
            ordersElement.textContent = data.totalOrders || 0;
        }
        
        if (revenueElement) {
            revenueElement.textContent = `$${(data.totalSales || 0).toFixed(2)}`;
        }
        
        if (topProductElement && data.topProducts && data.topProducts.length > 0) {
            topProductElement.textContent = data.topProducts[0].name || 'None';
        } else if (topProductElement) {
            topProductElement.textContent = 'None';
        }
        
        // Update the chart for this period
        const chartId = `${period}SalesChart`;
        const chartElement = document.getElementById(chartId);
        if (chartElement && data.salesByDate) {
            renderSalesChart(data.salesByDate, period, chartId);
        }
    })
    .catch(error => {
        console.error(`❌ Error loading ${period} sales analytics:`, error);
        // Show error message in the UI for this period
        [`${period}TotalOrders`, `${period}TotalRevenue`, `${period}TopProduct`].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = "Error";
        });
    });
}

// 🟢 Render Sales Chart
function renderSalesChart(salesData, period) {
    // Destroy existing chart if it exists
    if (window.salesChart) {
        window.salesChart.destroy();
    }
    
    const labels = salesData.map(item => item.date);
    const sales = salesData.map(item => item.sales);
    const orders = salesData.map(item => item.orders);
    
    // Get chart context
    const ctx = document.getElementById('salesChart').getContext('2d');
    
    // Create chart
    window.salesChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Sales ($)',
                    data: sales,
                    borderColor: '#4CAF50',
                    backgroundColor: 'rgba(76, 175, 80, 0.1)',
                    tension: 0.4,
                    yAxisID: 'y'
                },
                {
                    label: 'Orders',
                    data: orders,
                    borderColor: '#2196F3',
                    backgroundColor: 'rgba(33, 150, 243, 0.1)',
                    tension: 0.4,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            interaction: {
                mode: 'index',
                intersect: false
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: getPeriodLabel(period)
                    }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Sales ($)'
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Orders'
                    },
                    grid: {
                        drawOnChartArea: false
                    }
                }
            }
        }
    });
}

// 🟢 Get Period Label for Chart
function getPeriodLabel(period) {
    switch(period) {
        case 'day': return 'Hours';
        case 'week': return 'Days';
        case 'month': return 'Days';
        case 'year': return 'Months';
        default: return 'Date';
    }
}

// 🟢 Get Status Class for CSS styling
function getStatusClass(status) {
    switch(status.toLowerCase()) {
        case 'pending': return 'status-pending';
        case 'processing': return 'status-processing';
        case 'shipped': return 'status-shipped';
        case 'delivered': return 'status-delivered';
        case 'cancelled': return 'status-cancelled';
        default: return '';
    }
}

// 🟢 Get Order Status Buttons based on current status
function getStatusButtons(order) {
    const status = order.status.toLowerCase();
    let buttons = '';
    
    // Only show relevant next status buttons
    if (status === 'pending') {
        buttons += `<button onclick="updateOrderStatus(${order.id}, 'Processing')" class="status-btn processing-btn">Process</button>`;
        buttons += `<button onclick="updateOrderStatus(${order.id}, 'Cancelled')" class="status-btn cancel-btn">Cancel</button>`;
    } else if (status === 'processing') {
        buttons += `<button onclick="updateOrderStatus(${order.id}, 'Shipped')" class="status-btn shipping-btn">Ship</button>`;
    } else if (status === 'shipped') {
        buttons += `<button onclick="updateOrderStatus(${order.id}, 'Delivered')" class="status-btn deliver-btn">Deliver</button>`;
    }
    
    return buttons;
}

// 🟢 Render Pagination Controls
function renderPagination(total, currentPage, totalPages, containerId, loadFunction) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = '';
    
    if (totalPages <= 1) return;
    
    // Previous button
    const prevBtn = document.createElement('button');
    prevBtn.innerHTML = '&laquo;';
    prevBtn.disabled = currentPage === 1;
    prevBtn.onclick = () => loadFunction(currentPage - 1);
    container.appendChild(prevBtn);
    
    // Page numbers
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, currentPage + 2);
    
    // Adjust if we're near the start or end
    if (endPage - startPage < 4) {
        if (startPage === 1) {
            endPage = Math.min(5, totalPages);
        } else if (endPage === totalPages) {
            startPage = Math.max(1, totalPages - 4);
        }
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.textContent = i;
        pageBtn.className = i === currentPage ? 'active' : '';
        pageBtn.onclick = () => loadFunction(i);
        container.appendChild(pageBtn);
    }
    
    // Next button
    const nextBtn = document.createElement('button');
    nextBtn.innerHTML = '&raquo;';
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.onclick = () => loadFunction(currentPage + 1);
    container.appendChild(nextBtn);
}

// 🟢 Format Date Helper
function formatDate(dateString) {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
}

// 🟢 Show Notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    const container = document.getElementById('notificationContainer') || document.body;
    container.appendChild(notification);
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        notification.classList.add('hiding');
        setTimeout(() => notification.remove(), 500);
    }, 5000);
}

// 🟢 Setup search and filter functionality
function setupSearchFilter() {
    const searchInput = document.getElementById('productSearch');
    const categoryFilter = document.getElementById('categoryFilter');
    
    if (searchInput) {
        searchInput.addEventListener('input', debounce(() => {
            loadProducts(1, searchInput.value, categoryFilter?.value || '');
        }, 300));
    }
    
    if (categoryFilter) {
        categoryFilter.addEventListener('change', () => {
            loadProducts(1, searchInput?.value || '', categoryFilter.value);
        });
    }
}

// 🟢 Debounce helper for search input
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// 🟢 Setup tabs
function setupTabs() {
    const tabs = document.querySelectorAll('.sidebar a');
    const sections = document.querySelectorAll('.section');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Get the target section id from the href attribute
            const targetId = tab.getAttribute('href');
            
            // Hide all sections
            sections.forEach(section => {
                section.style.display = 'none';
            });
            
            // Show the target section
            document.querySelector(targetId).style.display = 'block';
            
            // Update active tab
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
        });
    });
}

// 🟢 Change sales period
function changeSalesPeriod(period) {
    document.querySelectorAll('.period-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`.period-btn[data-period="${period}"]`).classList.add('active');
    loadSalesAnalytics(period);
}

// 🟢 Initialize Dashboard
function initDashboard() {
    // Get admin info
    const token = localStorage.getItem("adminToken");
    if (!token) {
        window.location.href = "index.html";
        return;
    }
    
    // Get admin username
    fetch(`${API_URL}/api/admin/profile`, {
        headers: { 
            "Authorization": `Bearer ${token}`, 
            "Content-Type": "application/json"
        }
    })
    .then(response => response.json())
    .then(data => {
        document.getElementById("adminUsername").textContent = data.username;
    })
    .catch(() => {
        // Handle token expiration
        localStorage.removeItem("adminToken");
        window.location.href = "index.html";
    });
    
    // Load data
    loadDashboardStats();
    loadProducts();
    loadOrders();
    loadSalesAnalytics('month');
    
    // Setup event listeners
    setupSearchFilter();
    setupTabs();
    
    // Set up period buttons
    document.querySelectorAll('.period-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            changeSalesPeriod(btn.dataset.period);
        });
    });
    
    // Show default section
    document.querySelector('#dashboard-section').style.display = 'block';
    document.querySelector('.sidebar a').classList.add('active');
}

// 🟢 Close modal when clicking the × button
document.addEventListener("DOMContentLoaded", function() {
    // Setup modals
    document.querySelectorAll(".modal .close").forEach(closeBtn => {
        const modal = closeBtn.closest('.modal');
        closeBtn.onclick = function() {
            modal.style.display = "none";
        }
    });
    
    // Close modal when clicking outside
    window.onclick = function(event) {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = "none";
        }
    }
});

// 🟢 Initialize the dashboard when the page loads
document.addEventListener("DOMContentLoaded", function() {
    // Check if we're on the dashboard page
    if (document.querySelector('.sidebar')) {
        initDashboard();
    }
});



// 🟢 Tab Navigation for Sales Analytics
// 🟢 Tab Navigation for Sales Analytics - FIXED
function showSalesTab(tabName, clickEvent = null) {
    console.log("Switching to tab:", tabName);
    
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remove active class from all tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show the selected tab content
    const tabContent = document.getElementById(tabName + 'Sales');
    if (tabContent) tabContent.classList.add('active');
    
    // Add active class to the clicked button
    if (clickEvent && clickEvent.currentTarget) {
        clickEvent.currentTarget.classList.add('active');
    } else {
        // Find the button that corresponds to this tab and make it active
        const btn = document.querySelector(`.tab-btn[onclick*="'${tabName}'"]`);
        if (btn) btn.classList.add('active');
    }
    
    // Load data for the selected tab
    if (tabName === 'daily') {
        loadDailySales();
    } else if (tabName === 'monthly') {
        loadMonthlySales();
    } else if (tabName === 'yearly') {
        loadYearlySales();
    }
}

// 🟢 Load Daily Sales Data
function loadDailySales() {
    const token = localStorage.getItem("adminToken");
    if (!token) return;
    
    const dateInput = document.getElementById("dailyDate");
    const selectedDate = dateInput.value || new Date().toISOString().split('T')[0]; // Use today if not selected
    
    // Update input with selected date if empty
    if (!dateInput.value) {
        dateInput.value = selectedDate;
    }
    
    console.log("Loading daily sales for date:", selectedDate);
    
    // Show loading state
    document.getElementById("dailyTotalOrders").textContent = "Loading...";
    document.getElementById("dailyTotalRevenue").textContent = "Loading...";
    document.getElementById("dailyTopProduct").textContent = "Loading...";
    
    // Fetch daily sales data
    fetch(`${API_URL}/api/admin/sales/daily?date=${selectedDate}`, {
        headers: { 
            "Authorization": `Bearer ${token}`, 
            "Content-Type": "application/json"
        }
    })
    .then(response => {
        if (!response.ok) throw new Error(`Server error: ${response.status}`);
        return response.json();
    })
    .then(data => {
        console.log("Daily sales data:", data);
        
        // Update stats
        document.getElementById("dailyTotalOrders").textContent = data.total_orders || 0;
        document.getElementById("dailyTotalRevenue").textContent = `$${(data.total_revenue || 0).toFixed(2)}`;
        document.getElementById("dailyTopProduct").textContent = data.top_product?.name || "None";
        
        // Update chart
        renderDailySalesChart(data.hourly_sales || []);
    })
    .catch(error => {
        console.error("❌ Error loading daily sales:", error);
        
        // Show error state
        document.getElementById("dailyTotalOrders").textContent = "Error";
        document.getElementById("dailyTotalRevenue").textContent = "Error";
        document.getElementById("dailyTopProduct").textContent = "Error";
    });
}

// 🟢 Load Monthly Sales Data
function loadMonthlySales() {
    const token = localStorage.getItem("adminToken");
    if (!token) return;
    
    const monthInput = document.getElementById("monthlyDate");
    const currentDate = new Date();
    const defaultMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    const selectedMonth = monthInput.value || defaultMonth;
    
    // Update input with selected month if empty
    if (!monthInput.value) {
        monthInput.value = selectedMonth;
    }
    
    console.log("Loading monthly sales for month:", selectedMonth);
    
    // Show loading state
    document.getElementById("monthlyTotalOrders").textContent = "Loading...";
    document.getElementById("monthlyTotalRevenue").textContent = "Loading...";
    document.getElementById("monthlyTopProduct").textContent = "Loading...";
    
    // Fetch monthly sales data
    fetch(`${API_URL}/api/admin/sales/monthly?month=${selectedMonth}`, {
        headers: { 
            "Authorization": `Bearer ${token}`, 
            "Content-Type": "application/json"
        }
    })
    .then(response => {
        if (!response.ok) throw new Error(`Server error: ${response.status}`);
        return response.json();
    })
    .then(data => {
        console.log("Monthly sales data:", data);
        
        // Update stats
        document.getElementById("monthlyTotalOrders").textContent = data.total_orders || 0;
        document.getElementById("monthlyTotalRevenue").textContent = `$${(data.total_revenue || 0).toFixed(2)}`;
        document.getElementById("monthlyTopProduct").textContent = data.top_product?.name || "None";
        
        // Update chart
        renderMonthlySalesChart(data.daily_sales || []);
    })
    .catch(error => {
        console.error("❌ Error loading monthly sales:", error);
        
        // Show error state
        document.getElementById("monthlyTotalOrders").textContent = "Error";
        document.getElementById("monthlyTotalRevenue").textContent = "Error";
        document.getElementById("monthlyTopProduct").textContent = "Error";
    });
}

// 🟢 Load Yearly Sales Data
function loadYearlySales() {
    const token = localStorage.getItem("adminToken");
    if (!token) return;
    
    const yearSelect = document.getElementById("yearlyDate");
    const currentYear = new Date().getFullYear();
    const selectedYear = yearSelect.value || currentYear;
    
    // Populate year dropdown if empty
    if (yearSelect.options.length === 0) {
        for (let year = currentYear; year >= currentYear - 5; year--) {
            const option = document.createElement("option");
            option.value = year;
            option.textContent = year;
            yearSelect.appendChild(option);
        }
        yearSelect.value = currentYear;
    }
    
    console.log("Loading yearly sales for year:", selectedYear);
    
    // Show loading state
    document.getElementById("yearlyTotalOrders").textContent = "Loading...";
    document.getElementById("yearlyTotalRevenue").textContent = "Loading...";
    document.getElementById("yearlyTopProduct").textContent = "Loading...";
    
    // Fetch yearly sales data
    fetch(`${API_URL}/api/admin/sales/yearly?year=${selectedYear}`, {
        headers: { 
            "Authorization": `Bearer ${token}`, 
            "Content-Type": "application/json"
        }
    })
    .then(response => {
        if (!response.ok) throw new Error(`Server error: ${response.status}`);
        return response.json();
    })
    .then(data => {
        console.log("Yearly sales data:", data);
        
        // Update stats
        document.getElementById("yearlyTotalOrders").textContent = data.total_orders || 0;
        document.getElementById("yearlyTotalRevenue").textContent = `$${(data.total_revenue || 0).toFixed(2)}`;
        document.getElementById("yearlyTopProduct").textContent = data.top_product?.name || "None";
        
        // Update chart
        renderYearlySalesChart(data.monthly_sales || []);
    })
    .catch(error => {
        console.error("❌ Error loading yearly sales:", error);
        
        // Show error state
        document.getElementById("yearlyTotalOrders").textContent = "Error";
        document.getElementById("yearlyTotalRevenue").textContent = "Error";
        document.getElementById("yearlyTopProduct").textContent = "Error";
    });
}

// 🟢 Render Chart Functions
function renderDailySalesChart(hourlyData) {
    const ctx = document.getElementById('dailySalesChart').getContext('2d');
    
    // Destroy existing chart if it exists
    if (window.dailyChart) {
        window.dailyChart.destroy();
    }
    
    // Prepare data
    const hours = Array.from({length: 24}, (_, i) => `${i}:00`);
    const sales = Array(24).fill(0);
    
    // Map hourly data to the array
    hourlyData.forEach(item => {
        const hour = parseInt(item.hour);
        if (hour >= 0 && hour < 24) {
            sales[hour] = item.sales;
        }
    });
    
    // Create chart
    window.dailyChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: hours,
            datasets: [{
                label: 'Sales ($)',
                data: sales,
                backgroundColor: 'rgba(54, 162, 235, 0.5)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Sales ($)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Hour of Day'
                    }
                }
            }
        }
    });
}

function renderMonthlySalesChart(dailyData) {
    const ctx = document.getElementById('monthlySalesChart').getContext('2d');
    
    // Destroy existing chart if it exists
    if (window.monthlyChart) {
        window.monthlyChart.destroy();
    }
    
    // Extract dates and sales
    const dates = dailyData.map(item => item.date);
    const sales = dailyData.map(item => item.sales);
    
    // Create chart
    window.monthlyChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [{
                label: 'Sales ($)',
                data: sales,
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 2,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Sales ($)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Date'
                    }
                }
            }
        }
    });
}

function renderYearlySalesChart(monthlyData) {
    const ctx = document.getElementById('yearlySalesChart').getContext('2d');
    
    // Destroy existing chart if it exists
    if (window.yearlyChart) {
        window.yearlyChart.destroy();
    }
    
    // Month names
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Prepare data - initialize with zeros
    const sales = Array(12).fill(0);
    const orders = Array(12).fill(0);
    
    // Map monthly data to the arrays
    monthlyData.forEach(item => {
        const month = parseInt(item.month) - 1; // 0-indexed
        if (month >= 0 && month < 12) {
            sales[month] = item.sales;
            orders[month] = item.orders;
        }
    });
    
    // Create chart
    window.yearlyChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: months,
            datasets: [
                {
                    label: 'Sales ($)',
                    data: sales,
                    backgroundColor: 'rgba(255, 99, 132, 0.5)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 1,
                    yAxisID: 'y'
                },
                {
                    label: 'Orders',
                    data: orders,
                    backgroundColor: 'rgba(54, 162, 235, 0.5)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Sales ($)'
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Orders'
                    },
                    grid: {
                        drawOnChartArea: false
                    }
                }
            }
        }
    });
}

// Add this if you don't have a notification function
function showNotification(message, type = 'info') {
    const toast = document.getElementById('toast');
    
    if (!toast) return;
    
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toast.style.display = 'block';
    
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => {
            toast.style.display = 'none';
            toast.style.opacity = '1';
        }, 500);
    }, 3000);
}

// 🟢 Initialize the dashboard
document.addEventListener('DOMContentLoaded', function() {
    // Initialize tab functionality
    const salesTabs = document.querySelectorAll('.tab-container .tab-btn');
    if (salesTabs.length > 0) {
        // Set first tab as active by default
        showSalesTab('daily');
    }
});

// Modify or add this to your DOMContentLoaded event
document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on the admin panel (not login page)
    if (document.querySelector('.sidebar')) {
        console.log("Admin dashboard loaded, initializing...");
        
        // Load dashboard stats right away
        loadDashboardStats();
        
        // Initialize products, orders, etc.
        loadProducts();
        loadOrders();
        loadCategories();
        
        // Initialize sales tab if it exists
        if (document.querySelector('.tab-container')) {
            showSalesTab('daily');
        }
    }
});
