// Application State
let currentUser = null; // Will store user data received from backend
let searchHistory = []; // Will be loaded from/saved to backend for current user
let favoriteProperties = []; // Will be loaded from/saved to backend for current user
let allProperties = []; // This will eventually be fetched from the backend or kept client-side for initial load
let userPreferences = {}; // Will be loaded from/saved to backend for current user

// --- Backend API Base URL ---
const backendUrl = 'http://localhost:5000/api'; // Make sure this matches your backend server's address

// Sample Property Data (will be replaced by backend data or initially loaded)
// Keep this for now for initial display if backend properties aren't fetched immediately
const sampleProperties = [
    {
        id: "prop1",
        title: "Modern 2-Bedroom Apartment",
        location: "Westlands, Nairobi",
        price: 85000,
        type: "apartment",
        bedrooms: 2,
        bathrooms: 2,
        features: ["Parking", "Security", "Gym", "Pool"],
        coordinates: { lat: -1.2676, lng: 36.8108 },
        description: "Beautiful modern apartment in the heart of Westlands with excellent amenities.",
        imageUrl: "images/properties/apartment-westlands.jpg" // Updated path
    },
    {
        id: "prop2",
        title: "Spacious Family House",
        location: "Karen, Nairobi",
        price: 150000,
        type: "house",
        bedrooms: 4,
        bathrooms: 3,
        features: ["Garden", "Security", "DSQ"],
        coordinates: { lat: -1.3197, lng: 36.6859 },
        description: "Spacious family home in Karen with a beautiful garden and servant quarters.",
        imageUrl: "images/properties/house-karen.jpg" // Updated path
    },
    {
        id: "prop3",
        title: "Cozy Studio Apartment",
        location: "Kilimani, Nairobi",
        price: 45000,
        type: "studio",
        bedrooms: 1,
        bathrooms: 1,
        features: ["Parking", "Security", "WiFi"],
        coordinates: { lat: -1.2921, lng: 36.7856 },
        description: "Perfect studio apartment for young professionals in Kilimani.",
        imageUrl: "images/properties/studio-kilimani.jpg" // Updated path
    },
    {
        id: "prop4",
        title: "Charming 3-Bedroom Townhouse",
        location: "Kileleshwa, Nairobi",
        price: 70000,
        type: "townhouse",
        bedrooms: 3,
        bathrooms: 2,
        features: ["Shared Garden", "Backup Generator", "Good Schools Nearby"],
        coordinates: { lat: -1.2778, lng: 36.7905 },
        description: "A lovely townhouse in a quiet part of Kileleshwa, ideal for a small family.",
        imageUrl: "images/properties/townhouse-kileleshwa.jpg" // Updated path
    },
    {
        id: "prop5",
        title: "Modern 4-Bedroom Townhouse",
        location: "Lavington, Nairobi",
        price: 120000,
        type: "townhouse",
        bedrooms: 4,
        bathrooms: 3,
        features: ["Private Garden", "Servant Quarters", "Gated Community"],
        coordinates: { lat: -1.2890, lng: 36.7667 },
        description: "Contemporary townhouse in a secure Lavington compound.",
        imageUrl: "images/properties/townhouse lavington.jpg" // Updated path
    },
    {
        id: "prop6",
        title: "Spacious Commercial Office",
        location: "Nairobi CBD",
        price: 300000,
        type: "commercial",
        bedrooms: 0, // N/A for commercial
        bathrooms: 2, // Common bathrooms
        features: ["High-Speed Internet", "Ample Parking", "24/7 Security"],
        coordinates: { lat: -1.2833, lng: 36.8167 },
        description: "Prime office space in the heart of Nairobi CBD, suitable for various businesses.",
        imageUrl: "images/properties/office.jpg" // Updated path
    }
];


// Initialize the application
document.addEventListener('DOMContentLoaded', async function() {
    // Attempt to fetch all properties from the backend
    try {
        const response = await fetch(`${backendUrl}/properties`); // Assuming a /api/properties endpoint
        if (response.ok) {
            allProperties = await response.json();
            if (allProperties.length === 0) {
                // Fallback to sample data if no properties from backend
                allProperties = [...sampleProperties];
                console.warn('No properties fetched from backend, using sample data.');
            }
        } else {
            console.error('Failed to fetch properties from backend, using sample data.');
            allProperties = [...sampleProperties];
        }
    } catch (error) {
        console.error('Error fetching properties from backend:', error);
        allProperties = [...sampleProperties]; // Fallback if backend is down
    }

    displayProperties(allProperties);
    checkLoginStatus(); // This will try to auto-login based on stored token and then load user data
    // generateAIRecommendations() will be called after loadUserData, which ensures currentUser and other data are set
});

// Helper function to show notifications
function showNotification(message, type = 'info') {
    // Implement a more robust notification system (e.g., a div that appears and fades)
    // For now, an alert is fine.
    alert(`${type.toUpperCase()}: ${message}`);
}

// --- Password Visibility Toggle ---
function togglePasswordVisibility(fieldId) {
    const passwordField = document.getElementById(fieldId);
    // Find the icon assuming it's a sibling of the input within a common parent,
    // and the icon itself is an `<i>` tag directly inside the `span.password-toggle`.
    const toggleSpan = passwordField.nextElementSibling;
    const toggleIcon = toggleSpan ? toggleSpan.querySelector('i') : null;

    if (!toggleIcon) {
        console.error("Password toggle icon not found for field:", fieldId);
        return;
    }

    if (passwordField.type === 'password') {
        passwordField.type = 'text';
        toggleIcon.classList.remove('fa-eye');
        toggleIcon.classList.add('fa-eye-slash');
    } else {
        passwordField.type = 'password';
        toggleIcon.classList.remove('fa-eye-slash');
        toggleIcon.classList.add('fa-eye');
    }
}


// --- Password Requirements for Front-end Validation ---
const passwordRequirements = {
    minLength: 8,
    maxLength: 30,
    hasUpperCase: /[A-Z]/,
    hasLowerCase: /[a-z]/,
    hasNumber: /[0-9]/,
    hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/ // You can expand this regex for more specific special characters
};

function validatePassword(password) {
    let errors = [];

    if (password.length < passwordRequirements.minLength) {
        errors.push(`Password must be at least ${passwordRequirements.minLength} characters long.`);
    }
    if (password.length > passwordRequirements.maxLength) {
        errors.push(`Password must be no more than ${passwordRequirements.maxLength} characters long.`);
    }
    if (!passwordRequirements.hasUpperCase.test(password)) {
        errors.push('Password must contain at least one uppercase letter.');
    }
    if (!passwordRequirements.hasLowerCase.test(password)) {
        errors.push('Password must contain at least one lowercase letter.');
    }
    if (!passwordRequirements.hasNumber.test(password)) {
        errors.push('Password must contain at least one number.');
    }
    if (!passwordRequirements.hasSpecialChar.test(password)) {
        errors.push('Password must contain at least one special character (!@#$%^&*...).');
    }
    return errors; // Returns an array of error messages, or empty array if valid
}

// --- Authentication Functions ---
function openModal(modalId) {
    document.getElementById(modalId).style.display = 'block';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// Global variable to store currentUser and functions
let userLoggedIn = false; // Simple flag for UI updates
let userProfile = null; // Stores user details for display

// Function to update the UI based on login status
function updateAuthUI() {
    const authButtons = document.getElementById('authButtons');
    const userMenu = document.getElementById('userMenu');
    const userNameDisplay = document.getElementById('userNameDisplay');
    const userAvatarDisplay = document.getElementById('userAvatarDisplay');

    if (currentUser && currentUser.name) {
        authButtons.classList.add('hidden');
        userMenu.classList.remove('hidden');
        userNameDisplay.textContent = currentUser.name;
        userAvatarDisplay.textContent = currentUser.name.charAt(0).toUpperCase();
    } else {
        authButtons.classList.remove('hidden');
        userMenu.classList.add('hidden');
    }
}

// Mock login function for frontend demonstration
async function login(event) {
    event.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const response = await fetch(`${backendUrl}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await response.json();
        if (response.ok) {
            localStorage.setItem('authToken', data.token);
            currentUser = data.user; // Set the global currentUser
            updateAuthUI();
            // Redirect or show success message
            showNotification('Login successful! Welcome back.', 'success');
            // Optionally redirect to dashboard or home
            // window.location.href = 'index.html';
            loadUserData(); // Load user-specific data after login
            closeModal('loginModal'); // Close login modal if it exists
        } else {
            showNotification(`Login failed: ${data.message || 'Invalid credentials'}`, 'error');
        }
    } catch (error) {
        console.error('Error during login:', error);
        showNotification('An error occurred during login. Please try again later.', 'error');
    }
}

// Mock register function for frontend demonstration
async function register(event) {
    event.preventDefault();
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const phone = document.getElementById('registerPhone').value;
    const password = document.getElementById('registerPassword').value;
    const role = document.getElementById('registerRole').value; // 'tenant' or 'agent'

    const passwordErrors = validatePassword(password);
    if (passwordErrors.length > 0) {
        alert(passwordErrors.join('\\n'));
        return;
    }

    try {
        const response = await fetch(`${backendUrl}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, phone, password, role })
        });
        const data = await response.json();
        if (response.ok) {
            localStorage.setItem('authToken', data.token);
            currentUser = data.user; // Set the global currentUser
            updateAuthUI();
            showNotification('Registration successful! Welcome to HomeHunter Kenya.', 'success');
            // Optionally redirect to dashboard or home
            // window.location.href = 'index.html';
            loadUserData(); // Load user-specific data after registration
            closeModal('registerModal'); // Close register modal if it exists
        } else {
            showNotification(`Registration failed: ${data.message || 'Please try again.'}`, 'error');
        }
    } catch (error) {
        console.error('Error during registration:', error);
        showNotification('An error occurred during registration. Please try again later.', 'error');
    }
}

// Mock logout function
function logout() {
    localStorage.removeItem('authToken');
    currentUser = null;
    searchHistory = [];
    favoriteProperties = [];
    userPreferences = {};
    updateAuthUI();
    showNotification('Logged out successfully.', 'info');
    // Optional: reload properties to clear user-specific recommendations
    displayProperties(allProperties);
}

// Check login status on page load (e.g., from localStorage token)
async function checkLoginStatus() {
    const token = localStorage.getItem('authToken');
    if (token) {
        try {
            // Validate token with backend and fetch user data
            const response = await fetch(`${backendUrl}/auth/me`, { // Assuming an endpoint to get current user
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                currentUser = await response.json();
                updateAuthUI();
                await loadUserData(); // Load user-specific data after successful re-authentication
            } else {
                console.warn('Token invalid or expired, logging out.');
                logout(); // Log out if token is invalid
            }
        } catch (error) {
            console.error('Error checking login status:', error);
            logout(); // Log out on network error
        }
    } else {
        updateAuthUI(); // Ensure UI reflects logged out state
    }
}

// Dashboard functions (placeholders)
function showDashboard() {
    showNotification("Navigating to user dashboard (functionality to be implemented).", "info");
    // In a full application, this would redirect to a dashboard page or show a modal
    // window.location.href = 'dashboard.html';
}

// --- User Data Loading and Saving (Client-side mocks) ---
// In a real app, these would interact with your backend API
async function loadUserData() {
    if (!currentUser || !currentUser.id) {
        console.warn('No current user to load data for.');
        return;
    }

    const token = localStorage.getItem('authToken');
    if (!token) {
        console.warn('No auth token found, cannot load user data.');
        return;
    }

    try {
        // Fetch search history
        const historyResponse = await fetch(`${backendUrl}/user/${currentUser.id}/history`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (historyResponse.ok) {
            searchHistory = await historyResponse.json();
        } else {
            console.error('Failed to load search history:', await historyResponse.json());
            searchHistory = [];
        }

        // Fetch favorite properties
        const favResponse = await fetch(`${backendUrl}/user/${currentUser.id}/favorites`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (favResponse.ok) {
            favoriteProperties = await favResponse.json();
            updatePropertyCardFavoriteButtons(); // Update UI after loading favorites
        } else {
            console.error('Failed to load favorites:', await favResponse.json());
            favoriteProperties = [];
        }

        // Fetch user preferences
        const prefsResponse = await fetch(`${backendUrl}/user/${currentUser.id}/preferences`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (prefsResponse.ok) {
            userPreferences = await prefsResponse.json();
        } else {
            console.error('Failed to load preferences:', await prefsResponse.json());
            userPreferences = {};
        }

    } catch (error) {
        console.error('Network error loading user data:', error);
        showNotification('Failed to load user data. Please try logging in again.', 'error');
        // If critical error, you might want to force logout: logout();
    }

    // After loading, update the UI
    populateFavorites();
    populateSearchHistory();
    populatePreferencesForm();
    updatePropertyCardFavoriteButtons(); // Update property cards to reflect loaded favorites
}

// --- Event Listener setup for Forms ---
// We're removing the `onsubmit` attributes from HTML and using JS listeners for cleaner code.
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', login);
    }

    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', register);
    }
});

// Original functions that were intercepted are no longer needed as direct backend calls handle saving
// For example, toggleFavorite now directly calls the backend, which updates `favoriteProperties`
// via `loadUserData`, so `saveFavorites()` is implicitly handled by the backend.
// This simplifies the client-side state management significantly.


// --- Property Display Logic ---
function createPropertyCard(property) {
    const card = document.createElement('div');
    card.classList.add('property-card');

    // Check if the property is a favorite for the current user
    const isFavorite = currentUser ? favoriteProperties.some(fav => fav.id === property.id) : false;
    const favoriteClass = isFavorite ? 'fas' : 'far'; // 'fas' for solid, 'far' for regular (outline)

    card.innerHTML = `
        <div class="property-image">
            <img src="${property.imageUrl}" alt="${property.title}" onerror="this.onerror=null;this.src='images/placeholder.jpg';">
        </div>
        <div class="property-info">
            <h3 class="property-title">${property.title}</h3>
            <p class="property-location"><i class="fas fa-map-marker-alt"></i> ${property.location}</p>
            <p class="property-price">KSh ${property.price.toLocaleString()}${property.type !== 'commercial' ? '/month' : ''}</p>
            <div class="property-features">
                <span class="feature"><i class="fas fa-bed"></i> ${property.bedrooms} Beds</span>
                <span class="feature"><i class="fas fa-bath"></i> ${property.bathrooms} Baths</span>
            </div>
            <div class="property-actions">
                <button class="btn btn-primary btn-small">View Details</button>
                <button class="btn btn-icon btn-favorite ${isFavorite ? 'favorite-active' : ''}" data-property-id="${property.id}" onclick="toggleFavorite('${property.id}')">
                    <i class="${favoriteClass} fa-heart"></i>
                </button>
            </div>
        </div>
    `;
    return card;
}

function displayProperties(properties, containerId = 'propertiesGrid') {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Container with ID ${containerId} not found.`);
        return;
    }
    container.innerHTML = ''; // Clear existing properties
    properties.forEach(property => {
        const card = createPropertyCard(property);
        container.appendChild(card);
    });
}

function updatePropertyCardFavoriteButtons() {
    document.querySelectorAll('.btn-favorite').forEach(button => {
        const propertyId = button.dataset.propertyId;
        const isFavorite = currentUser ? favoriteProperties.some(fav => fav.id === propertyId) : false;
        const icon = button.querySelector('i');
        if (icon) {
            icon.classList.toggle('fas', isFavorite);
            icon.classList.toggle('far', !isFavorite);
        }
        button.classList.toggle('favorite-active', isFavorite);
    });
}

// --- Favorite Management ---
async function toggleFavorite(propertyId) {
    if (!currentUser) {
        showNotification('Please log in to add favorites.', 'info');
        // Optionally, open login modal
        // openModal('loginModal');
        return;
    }

    const token = localStorage.getItem('authToken');
    if (!token) {
        showNotification('Authentication token missing. Please log in again.', 'error');
        logout();
        return;
    }

    const isCurrentlyFavorite = favoriteProperties.some(fav => fav.id === propertyId);
    const method = isCurrentlyFavorite ? 'DELETE' : 'POST';
    const url = `${backendUrl}/user/${currentUser.id}/favorites/${propertyId}`;

    try {
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (response.ok) {
            // Re-load favorites to ensure UI is in sync with backend
            await loadUserData();
            showNotification(`Property ${isCurrentlyFavorite ? 'removed from' : 'added to'} favorites.`, 'success');
        } else {
            showNotification(`Failed to update favorites: ${data.message || 'Server error.'}`, 'error');
        }
    } catch (error) {
        console.error('Error toggling favorite:', error);
        showNotification('An error occurred while updating favorites. Please try again.', 'error');
    }
}

// --- Search History Management ---
async function addSearchToHistory(searchQuery) {
    if (!currentUser || !currentUser.id || !searchQuery.location) { // Ensure location is present
        return; // Don't add if no user or no meaningful query
    }

    const token = localStorage.getItem('authToken');
    if (!token) {
        console.warn('No auth token, cannot save search history.');
        return;
    }

    try {
        // Send search query to backend to be saved
        const response = await fetch(`${backendUrl}/user/${currentUser.id}/history`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(searchQuery)
        });

        if (response.ok) {
            // Re-load history to update client-side state
            await loadUserData();
            console.log('Search history updated.');
        } else {
            console.error('Failed to save search history:', await response.json());
        }
    } catch (error) {
        console.error('Error saving search history:', error);
    }
}

// --- AI Recommendations ---
async function generateAIRecommendations() {
    const recommendationsContainer = document.getElementById('aiRecommendations');
    if (!recommendationsContainer) return;

    if (!currentUser || !userPreferences || Object.keys(userPreferences).length === 0) {
        recommendationsContainer.innerHTML = '<p class="text-center">Log in and set your preferences to see personalized AI recommendations!</p>';
        return;
    }

    const token = localStorage.getItem('authToken');
    if (!token) {
        recommendationsContainer.innerHTML = '<p class="text-center">Login to see personalized AI recommendations!</p>';
        return;
    }

    try {
        const response = await fetch(`${backendUrl}/ai/recommendations/${currentUser.id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            const recommendedProperties = await response.json();
            if (recommendedProperties.length > 0) {
                displayProperties(recommendedProperties, 'aiRecommendations');
            } else {
                recommendationsContainer.innerHTML = '<p class="text-center">No AI recommendations available based on your preferences yet.</p>';
            }
        } else {
            console.error('Failed to fetch AI recommendations:', await response.json());
            recommendationsContainer.innerHTML = '<p class="text-center">Failed to load AI recommendations. Please try again later.</p>';
        }
    } catch (error) {
        console.error('Error fetching AI recommendations:', error);
        recommendationsContainer.innerHTML = '<p class="text-center">An error occurred while fetching AI recommendations.</p>';
    }
}


// --- Form Handlers ---
document.getElementById('searchForm').addEventListener('submit', async function(event) {
    event.preventDefault();
    const location = document.getElementById('location').value;
    const propertyType = document.getElementById('propertyType').value;
    const minPrice = document.getElementById('minPrice').value;
    const maxPrice = document.getElementById('maxPrice').value;

    const searchQuery = {
        location,
        propertyType,
        minPrice: minPrice ? parseFloat(minPrice) : undefined,
        maxPrice: maxPrice ? parseFloat(maxPrice) : undefined
    };

    // Add to search history
    await addSearchToHistory(searchQuery);

    // Filter properties based on search query (client-side filtering for demo)
    const filteredProperties = allProperties.filter(property => {
        const matchesLocation = location ? property.location.toLowerCase().includes(location.toLowerCase()) : true;
        const matchesType = propertyType ? property.type === propertyType : true;
        const matchesMinPrice = minPrice ? property.price >= parseFloat(minPrice) : true;
        const matchesMaxPrice = maxPrice ? property.price <= parseFloat(maxPrice) : true;
        return matchesLocation && matchesType && matchesMinPrice && matchesMaxPrice;
    });

    displayProperties(filteredProperties, 'propertiesGrid');
    if (filteredProperties.length === 0) {
        document.getElementById('propertiesGrid').innerHTML = '<p class="text-center">No properties found matching your search criteria.</p>';
    }
});

// --- Dashboard Form Handlers (Placeholders for now) ---
function populateSearchHistory() {
    const historyList = document.getElementById('searchHistoryList');
    if (historyList) {
        historyList.innerHTML = '';
        if (searchHistory.length === 0) {
            historyList.innerHTML = '<p>No search history yet.</p>';
            return;
        }
        searchHistory.forEach(historyItem => {
            const li = document.createElement('li');
            li.textContent = `Location: ${historyItem.location || 'N/A'}, Type: ${historyItem.propertyType || 'Any'}, Price: KSh ${historyItem.minPrice || 'Min'} - KSh ${historyItem.maxPrice || 'Max'}`;
            historyList.appendChild(li);
        });
    }
}

function populateFavorites() {
    const favoritesList = document.getElementById('favoritePropertiesList');
    if (favoritesList) {
        favoritesList.innerHTML = '';
        if (favoriteProperties.length === 0) {
            favoritesList.innerHTML = '<p>No favorite properties yet.</p>';
            return;
        }
        favoriteProperties.forEach(fav => {
            const property = allProperties.find(p => p.id === fav.id);
            if (property) {
                const li = document.createElement('li');
                li.textContent = `${property.title} in ${property.location} (KSh ${property.price.toLocaleString()})`;
                favoritesList.appendChild(li);
            }
        });
    }
}

function populatePreferencesForm() {
    const preferencesForm = document.getElementById('preferencesForm');
    if (preferencesForm) {
        document.getElementById('prefLocation').value = userPreferences.location || '';
        document.getElementById('prefPropertyType').value = userPreferences.propertyType || '';
        document.getElementById('prefMinBedrooms').value = userPreferences.minBedrooms || '';
        document.getElementById('prefMaxPrice').value = userPreferences.maxPrice || '';
    }
}

document.getElementById('preferencesForm')?.addEventListener('submit', async function(event) {
    event.preventDefault();
    if (!currentUser) {
        showNotification('Please log in to save preferences.', 'info');
        return;
    }

    const token = localStorage.getItem('authToken');
    if (!token) {
        showNotification('Authentication token missing. Please log in again.', 'error');
        logout();
        return;
    }

    const newPreferences = {
        location: document.getElementById('prefLocation').value,
        propertyType: document.getElementById('prefPropertyType').value,
        minBedrooms: parseInt(document.getElementById('prefMinBedrooms').value) || undefined,
        maxPrice: parseFloat(document.getElementById('prefMaxPrice').value) || undefined
    };

    try {
        const response = await fetch(`${backendUrl}/user/${currentUser.id}/preferences`, {
            method: 'PUT', // or POST depending on your API design
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(newPreferences)
        });

        if (response.ok) {
            userPreferences = newPreferences; // Update client-side state
            showNotification('Preferences saved successfully!', 'success');
            await generateAIRecommendations(); // Regenerate recommendations based on new preferences
        } else {
            showNotification(`Failed to save preferences: ${await response.json().then(data => data.message || 'Server error.')}`, 'error');
        }
    } catch (error) {
        console.error('Error saving preferences:', error);
        showNotification('An error occurred while saving preferences. Please try again.', 'error');
    }
});

// Assuming your properties.html also uses displayProperties and updatePropertyCardFavoriteButtons
// You might need to add a call to displayProperties(allProperties, 'allPropertiesGrid');
// and displayProperties(relatedProperties, 'relatedPropertiesGrid'); on properties.html's DOMContentLoaded.