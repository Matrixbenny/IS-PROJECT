// js/auth.js

// Function to toggle password visibility
function togglePasswordVisibility(id) {
    const passwordInput = document.getElementById(id);
    // Ensure the nextSibling exists and has a querySelector for the icon
    const toggleIconContainer = passwordInput.nextElementSibling;
    if (!toggleIconContainer) {
        console.warn(`No sibling element found for password input with ID: ${id}`);
        return;
    }
    const toggleIcon = toggleIconContainer.querySelector('i');

    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        if (toggleIcon) {
            toggleIcon.classList.remove('fa-eye');
            toggleIcon.classList.add('fa-eye-slash');
        }
    } else {
        passwordInput.type = 'password';
        if (toggleIcon) {
            toggleIcon.classList.remove('fa-eye-slash');
            toggleIcon.classList.add('fa-eye');
        }
    }
}

// Backend URL constant (important for fetch requests)
// Ensure this matches your server.js port
const backendUrl = 'http://localhost:5000'; // Define backendUrl here if not in a global script.js

// Function to handle user registration
async function register(event) {
    event.preventDefault(); // Prevent default form submission

    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const phone = document.getElementById('registerPhone').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value; // Added this line
    const role = document.getElementById('registerRole').value;

    if (!name || !email || !phone || !password || !confirmPassword || !role) { // Updated validation
        showNotification('Please fill in all fields.', 'error');
        return;
    }

    if (password !== confirmPassword) { // Added password confirmation check
        showNotification('Passwords do not match.', 'error');
        return;
    }

    if (password.length < 8) {
        showNotification('Password must be at least 8 characters long.', 'error');
        return;
    }
    // Basic email regex (more robust regex for production if needed)
    if (!/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(email)) {
        showNotification('Please enter a valid email address.', 'error');
        return;
    }

    try {
        const response = await fetch(`${backendUrl}/api/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                fullName: name,
                emailAddress: email,
                phoneNumber: phone,
                password: password,
                userRole: role
            }),
        });
        const data = await response.json();
        if (response.ok) {
            showNotification('Registration successful! Please check your email for the confirmation code.', 'success');
            // Optionally show the Ethereal preview link for demo
            if (data.etherealPreview) {
                setTimeout(() => {
                    window.open(data.etherealPreview, '_blank');
                }, 1000);
            }
            setTimeout(() => {
                window.location.href = 'verify-code.html';
            }, 2000);
        } else {
            showNotification(`Registration failed: ${data.message || 'Something went wrong.'}`, 'error');
        }
    } catch (error) {
        console.error('Error during registration:', error);
        showNotification('An error occurred during registration. Please try again later.', 'error');
    }
}

// Function to handle user login
async function login(event) {
    event.preventDefault(); // Prevent default form submission

    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    if (!email || !password) {
        showNotification('Please enter both email and password.', 'error');
        return;
    }

    try {
        const response = await fetch(`${backendUrl}/api/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
        });
        const data = await response.json();
        if (response.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify({
                id: data.user.id,
                name: data.user.name,
                email: data.user.email,
                role: data.user.role
            }));
            showNotification('Login successful! Welcome back.', 'success');
            window.location.href = 'index.html';
        } else {
            if (data.message && data.message.includes('verify')) {
                showNotification('Please verify your email before logging in. Check your inbox.', 'error');
            } else {
                showNotification(`Login failed: ${data.message || 'Invalid credentials.'}`, 'error');
            }
        }
    } catch (error) {
        console.error('Error during login:', error);
        showNotification('An error occurred during login. Please try again later.', 'error');
    }
}

// Function to handle user logout (will be called from common script.js)
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    // Optionally clear other user-specific localStorage items if they exist
    localStorage.removeItem('favoriteProperties');
    localStorage.removeItem('searchHistory');
    localStorage.removeItem('userPreferences');

    showNotification('Logged out successfully.', 'info');
    // Redirect to home page or login page after logout
    window.location.href = 'index.html';
}

// Global notification function (moved here for unified usage)
// This should be styled with CSS to look better than a simple alert
function showNotification(message, type = 'info') {
    // You can replace this with a more sophisticated UI notification system (e.g., a toast message library)
    alert(`${type.toUpperCase()}: ${message}`);
}