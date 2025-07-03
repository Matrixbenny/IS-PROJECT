// js/auth.js

// Function to toggle password visibility
function togglePasswordVisibility(id) {
    const passwordInput = document.getElementById(id);
    const toggleIcon = passwordInput.nextElementSibling.querySelector('i');

    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleIcon.classList.remove('fa-eye');
        toggleIcon.classList.add('fa-eye-slash');
    } else {
        passwordInput.type = 'password';
        toggleIcon.classList.remove('fa-eye-slash');
        toggleIcon.classList.add('fa-eye');
    }
}

// Function to handle user registration
async function register(event) {
    event.preventDefault(); // Prevent default form submission

    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const phone = document.getElementById('registerPhone').value;
    const password = document.getElementById('registerPassword').value;
    const role = document.getElementById('registerRole').value;

    if (!name || !email || !phone || !password || !role) {
        alert('Please fill in all fields.');
        return;
    }

    try {
        const response = await fetch('http://localhost:3000/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name, email, phone, password, role }),
        });

        const data = await response.json();

        if (response.ok) {
            alert('Registration successful! Please log in.');
            window.location.href = 'login.html'; // Redirect to login page
        } else {
            alert(`Registration failed: ${data.message || 'Something went wrong'}`);
        }
    } catch (error) {
        console.error('Error during registration:', error);
        alert('An error occurred during registration. Please try again later.');
    }
}

// Function to handle user login
async function login(event) {
    event.preventDefault(); // Prevent default form submission

    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    if (!email || !password) {
        alert('Please enter both email and password.');
        return;
    }

    try {
        const response = await fetch('http://localhost:3000/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user)); // Store user details
            alert('Login successful!');
            window.location.href = 'index.html'; // Redirect to home page or dashboard
        } else {
            alert(`Login failed: ${data.message || 'Invalid credentials'}`);
        }
    } catch (error) {
        console.error('Error during login:', error);
        alert('An error occurred during login. Please try again later.');
    }
}