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
        id: "prop1", // Use strings for IDs if MongoDB _id is used
        title: "Modern 2-Bedroom Apartment",
        location: "Westlands, Nairobi",
        price: 85000,
        type: "apartment",
        bedrooms: 2,
        bathrooms: 2,
        features: ["Parking", "Security", "Gym", "Pool"],
        coordinates: { lat: -1.2676, lng: 36.8108 },
        description: "Beautiful modern apartment in the heart of Westlands with excellent amenities.",
        imageUrl: "https://via.placeholder.com/400x200/667eea/ffffff?text=Apartment+Image"
    },
    {
        id: "prop2",
        title: "Spacious Family House",
        location: "Karen, Nairobi",
        price: 150000,
        type: "house",
        bedrooms: 4,
        bathrooms: 3,
        features: ["Garden", "Security", "DSQ"], // Removed "Parking" as it's implied for a house
        coordinates: { lat: -1.3197, lng: 36.6859 },
        description: "Spacious family home in Karen with a beautiful garden and servant quarters.",
        imageUrl: "https://via.placeholder.com/400x200/764ba2/ffffff?text=House+Image"
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
        imageUrl: "https://via.placeholder.com/400x200/667eea/ffffff?text=Studio+Image"
    },
    {
        id: "prop4",
        title: "Luxury Penthouse",
        location: "Upper Hill, Nairobi",
        price: 250000,
        type: "apartment",
        bedrooms: 3,
        bathrooms: 3,
        features: ["Parking", "Security", "Gym", "Pool", "Balcony", "City View"],
        coordinates: { lat: -1.2921, lng: 36.8219 },
        description: "Luxury penthouse with stunning city views and premium amenities.",
        imageUrl: "https://via.placeholder.com/400x200/764ba2/ffffff?text=Penthouse+Image"
    },
    {
        id: "prop5",
        title: "Affordable Bedsitter",
        location: "Kasarani, Nairobi",
        price: 25000,
        type: "bedsitter",
        bedrooms: 1,
        bathrooms: 1,
        features: ["Security", "Water"],
        coordinates: { lat: -1.2297, lng: 36.8926 },
        description: "Affordable bedsitter in a quiet neighborhood with good transport links.",
        imageUrl: "https://via.placeholder.com/400x200/667eea/ffffff?text=Bedsitter+Image"
    },
    {
        id: "prop6",
        title: "Executive Mansion",
        location: "Runda, Nairobi",
        price: 400000,
        type: "mansion",
        bedrooms: 5,
        bathrooms: 5,
        features: ["Garden", "Parking", "Security", "Pool", "DSQ", "Study"],
        coordinates: { lat: -1.2098, lng: 36.7640 },
        description: "Executive mansion in Runda with all modern amenities and beautiful landscaping.",
        imageUrl: "https://via.placeholder.com/400x200/764ba2/ffffff?text=Mansion+Image"
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

async function login(event) {
    event.preventDefault(); // Prevent default form submission

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
            // Login successful
            currentUser = data.user; // Backend should return user data (e.g., id, name, email, role)
            // Assuming backend sends a 'token' for future authenticated requests (e.g., JWT)
            localStorage.setItem('authToken', data.token); // Store the token
            localStorage.setItem('currentUserData', JSON.stringify(data.user)); // Store basic user data for UI persistence
            updateAuthUI();
            closeModal('loginModal');
            showNotification('Login successful! Welcome back, ' + currentUser.fullName + '.', 'success');
            await loadUserData(); // Load user-specific data (favorites, history, preferences)
            showDashboard(); // Show dashboard after successful login
        } else {
            // Login failed (e.g., wrong credentials)
            showNotification(data.msg || 'Login failed. Please check your credentials.', 'error');
            console.error('Login error:', data.msg);
        }
    } catch (error) {
        console.error('Network error during login:', error);
        showNotification('An error occurred during login. Please try again.', 'error');
    }
}

async function register(event) {
    event.preventDefault(); // Prevent default form submission

    const fullName = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const phoneNumber = document.getElementById('registerPhone').value;
    const password = document.getElementById('registerPassword').value;
    const role = document.getElementById('registerRole').value;

    if (!role) {
        showNotification("Please select a user type (Tenant or Real Estate Agent).", 'warning');
        return;
    }

    // --- Front-end password validation ---
    const passwordErrors = validatePassword(password);
    if (passwordErrors.length > 0) {
        // Display all errors in a single alert/notification
        showNotification('Password does not meet requirements:\n' + passwordErrors.join('\n'), 'error');
        return; // Stop execution if validation fails
    }
    // --- End front-end password validation ---

    try {
        const response = await fetch(`${backendUrl}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fullName, email, phoneNumber, password, role })
        });

        const data = await response.json();

        if (response.ok) {
            // Registration successful
            showNotification(data.msg, 'success');
            console.log('Registered user:', data.user);
            closeModal('registerModal');
            // Optionally, automatically log in the user or prompt them to login
            openModal('loginModal');
        } else {
            // Registration failed (e.g., email already exists or backend validation errors)
            showNotification(data.msg || 'Registration failed.', 'error');
            console.error('Registration error:', data.msg);
        }
    } catch (error) {
        console.error('Network error during registration:', error);
        showNotification('An error occurred during registration. Please try again.', 'error');
    }
}

function logout() {
    currentUser = null;
    favoriteProperties = [];
    searchHistory = [];
    userPreferences = {};
    localStorage.removeItem('authToken'); // Clear authentication token
    localStorage.removeItem('currentUserData'); // Clear stored user data
    updateAuthUI();
    hideDashboard();
    showNotification('Logged out successfully.', 'info');
    generateAIRecommendations(); // Regenerate AI recommendations for a non-logged-in user
}

async function checkLoginStatus() {
    // In a real app, this would send the stored token to the backend for validation.
    // For simplicity, we'll check for the presence of a token and stored user data.
    const token = localStorage.getItem('authToken');
    const storedUserData = localStorage.getItem('currentUserData');

    if (token && storedUserData) {
        try {
            currentUser = JSON.parse(storedUserData);
            // You might want to add a backend endpoint to verify the token's validity
            // e.g., const response = await fetch(`${backendUrl}/auth/verify`, { headers: { 'x-auth-token': token } });
            // If response.ok, then proceed. Otherwise, clear token.

            updateAuthUI();
            await loadUserData(); // Load user-specific data from backend
            showNotification('Welcome back!', 'info');
        } catch (error) {
            console.error('Error parsing stored user data:', error);
            logout(); // Clear invalid data
        }
    } else {
        // Ensure auth buttons are visible if no user is logged in
        const authButtons = document.getElementById('authButtons');
        const userMenu = document.getElementById('userMenu');
        if (authButtons) authButtons.classList.remove('hidden');
        if (userMenu) userMenu.classList.add('hidden');
        // If no user is logged in, still generate general recommendations
        generateAIRecommendations();
    }
}

function updateAuthUI() {
    const authButtons = document.getElementById('authButtons');
    const userMenu = document.getElementById('userMenu');
    const userNameElem = document.getElementById('userName');
    const userEmailElem = document.getElementById('userEmail');
    const userAvatarElem = document.getElementById('userAvatar');

    if (currentUser) {
        authButtons.classList.add('hidden');
        userMenu.classList.remove('hidden');
        if (userNameElem) userNameElem.textContent = currentUser.fullName;
        if (userEmailElem) userEmailElem.textContent = currentUser.email;
        if (userAvatarElem && currentUser.fullName) {
            userAvatarElem.textContent = currentUser.fullName.split(' ').map(n => n[0]).join('').toUpperCase();
        }
    } else {
        authButtons.classList.remove('hidden');
        userMenu.classList.add('hidden');
    }
}

// --- Property Display Functions ---
function createPropertyCard(property) {
    const card = document.createElement('div');
    card.classList.add('property-card', 'fade-in');
    card.innerHTML = `
        <div class="property-image">
            <img src="${property.imageUrl || 'https://via.placeholder.com/400x200/ccc/fff?text=No+Image'}" alt="${property.title}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 15px 15px 0 0;">
        </div>
        <div class="property-info">
            <h3 class="property-title">${property.title}</h3>
            <p class="property-location"><i class="fas fa-map-marker-alt"></i> ${property.location}</p>
            <p class="property-price">KSh ${property.price.toLocaleString()}</p>
            <div class="property-features">
                <span class="feature"><i class="fas fa-bed"></i> ${property.bedrooms} Beds</span>
                <span class="feature"><i class="fas fa-bath"></i> ${property.bathrooms} Baths</span>
                <span class="feature"><i class="fas fa-building"></i> ${property.type.charAt(0).toUpperCase() + property.type.slice(1)}</span>
            </div>
            <div class="property-actions">
                <a href="#" class="btn btn-primary btn-small">View Details</a>
                <button class="btn btn-secondary btn-small" onclick="toggleFavorite('${property._id || property.id}')">
                    <i class="fas fa-heart"></i> ${isFavorite(property._id || property.id) ? 'Favorited' : 'Favorite'}
                </button>
            </div>
        </div>
    `;
    return card;
}

function displayProperties(properties, containerId = 'propertiesGrid') {
    const container = document.getElementById(containerId);
    container.innerHTML = ''; // Clear previous properties
    if (properties.length === 0) {
        container.innerHTML = '<p class="text-center">No properties found matching your criteria.</p>';
        return;
    }
    properties.forEach(property => {
        container.appendChild(createPropertyCard(property));
    });
    // After displaying properties, update favorite button states
    updatePropertyCardFavoriteButtons();
}

// --- Search Functionality ---
async function searchProperties(event) {
    event.preventDefault();

    const location = document.getElementById('location').value; // Keep original casing for query
    const propertyType = document.getElementById('propertyType').value;
    const minPrice = parseFloat(document.getElementById('minPrice').value) || 0;
    const maxPrice = parseFloat(document.getElementById('maxPrice').value) || Infinity;
    const bedrooms = document.getElementById('bedrooms').value;

    const query = { location, propertyType, minPrice, maxPrice, bedrooms };

    // --- Send search query to backend ---
    try {
        const urlParams = new URLSearchParams({
            location,
            type: propertyType,
            minPrice: minPrice.toString(),
            maxPrice: maxPrice === Infinity ? '' : maxPrice.toString(), // Send empty string for Infinity
            bedrooms
        }).toString();

        const response = await fetch(`${backendUrl}/properties/search?${urlParams}`);
        const data = await response.json();

        if (response.ok) {
            displayProperties(data.properties);
            showNotification(`Found ${data.properties.length} properties.`, 'info');
            // Add search to history *after* successful search and if user is logged in
            if (currentUser) {
                    await addSearchToHistory(query);
            }
        } else {
            showNotification(data.msg || 'Error searching properties.', 'error');
            console.error('Search error:', data.msg);
        }
    } catch (error) {
        console.error('Network error during search:', error);
        showNotification('An error occurred during search. Please try again.', 'error');
    }
}

// --- User Dashboard Functions ---
function showDashboard() {
    if (!currentUser) {
        showNotification('Please login to view your dashboard.', 'info');
        openModal('loginModal');
        return;
    }
    // Correctly handle visibility
    document.querySelector('.main-content').classList.add('hidden'); // Hide main content
    document.getElementById('userDashboard').style.display = 'block'; // Show dashboard
    showTab('favorites'); // Default to favorites tab
    populateFavorites(); // Populate now that data is loaded
    populateSearchHistory();
    populatePreferencesForm();
}

function hideDashboard() {
    document.getElementById('userDashboard').style.display = 'none';
    document.querySelector('.main-content').classList.remove('hidden'); // Show main content
}

function showTab(tabId) {
    const tabs = document.querySelectorAll('.tab-content');
    tabs.forEach(tab => tab.classList.remove('active'));
    document.getElementById(`${tabId}Tab`).classList.add('active');

    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => btn.classList.remove('active'));
    document.querySelector(`.tab-btn[onclick="showTab('${tabId}')"]`).classList.add('active');
}

// --- Favorites ---
function isFavorite(propertyId) {
    // Backend returns an array of property IDs for favorites directly for simplicity
    return favoriteProperties.includes(propertyId);
}

async function toggleFavorite(propertyId) {
    if (!currentUser) {
        showNotification('Please login to add to favorites.', 'info');
        openModal('loginModal');
        return;
    }

    const token = localStorage.getItem('authToken');
    if (!token) {
        showNotification('You need to be logged in to manage favorites.', 'error');
        return;
    }

    const isCurrentlyFavorite = isFavorite(propertyId);
    const method = isCurrentlyFavorite ? 'DELETE' : 'POST';
    const endpoint = isCurrentlyFavorite ? `${backendUrl}/users/${currentUser.id}/favorites/${propertyId}` : `${backendUrl}/users/${currentUser.id}/favorites`;
    const body = isCurrentlyFavorite ? null : JSON.stringify({ propertyId: propertyId });

    try {
        const response = await fetch(endpoint, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'x-auth-token': token // Send authorization token
            },
            body: body
        });

        const data = await response.json();

        if (response.ok) {
            // Re-fetch favorites from backend to ensure state is accurate
            await loadUserData(); // This will update favoriteProperties and trigger UI updates
            showNotification(data.msg, 'success');
        } else {
            showNotification(data.msg || 'Failed to update favorites.', 'error');
            console.error('Favorite update error:', data.msg);
        }
    } catch (error) {
        console.error('Network error during favorite update:', error);
        showNotification('An error occurred. Please try again.', 'error');
    }
}


function populateFavorites() {
    const favoritesList = document.getElementById('favoritesList');
    favoritesList.innerHTML = '';
    if (favoriteProperties.length === 0) {
        favoritesList.innerHTML = '<p class="text-center">You have no favorite properties yet.</p>';
        return;
    }
    favoriteProperties.forEach(favId => {
        // Find the full property details from allProperties using favId
        const property = allProperties.find(p => (p._id && p._id === favId) || (p.id && p.id === favId));
        if (property) {
            const favItem = document.createElement('div');
            favItem.classList.add('favorite-item');
            favItem.innerHTML = `
                <span>${property.title} - ${property.location}</span>
                <button class="remove-favorite" onclick="toggleFavorite('${property._id || property.id}')">
                    <i class="fas fa-times"></i>
                </button>
            `;
            favoritesList.appendChild(favItem);
        }
    });
}

function updatePropertyCardFavoriteButtons() {
    document.querySelectorAll('.property-card').forEach(card => {
        const favoriteButton = card.querySelector('.btn-small[onclick^="toggleFavorite"]');
        if (favoriteButton) {
            const onclickAttr = favoriteButton.getAttribute('onclick');
            const match = onclickAttr.match(/toggleFavorite\(['"]([^'"]+)['"]\)/);
            if (match && match[1]) {
                const propertyId = match[1];
                if (isFavorite(propertyId)) {
                    favoriteButton.innerHTML = '<i class="fas fa-heart"></i> Favorited';
                    favoriteButton.classList.remove('btn-secondary');
                    favoriteButton.classList.add('btn-primary');
                } else {
                    favoriteButton.innerHTML = '<i class="fas fa-heart"></i> Favorite';
                    favoriteButton.classList.remove('btn-primary');
                    favoriteButton.classList.add('btn-secondary');
                }
            }
        }
    });
}


// --- Search History ---
async function addSearchToHistory(query) {
    if (!currentUser) return; // Only add history for logged-in users

    const token = localStorage.getItem('authToken');
    if (!token) return;

    try {
        const response = await fetch(`${backendUrl}/users/${currentUser.id}/history`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-auth-token': token
            },
            body: JSON.stringify(query) // Send the search query object
        });

        const data = await response.json();
        if (response.ok) {
            searchHistory = data.history; // Backend returns updated history
            populateSearchHistory();
            // showNotification('Search added to history.', 'info'); // Maybe too many notifications
        } else {
            console.error('Failed to add search to history:', data.msg);
        }
    } catch (error) {
        console.error('Network error adding search to history:', error);
    }
}

function populateSearchHistory() {
    const historyList = document.getElementById('searchHistory');
    historyList.innerHTML = '';
    if (searchHistory.length === 0) {
        historyList.innerHTML = '<p class="text-center">Your search history is empty.</p>';
        return;
    }
    searchHistory.forEach(search => {
        const searchItem = document.createElement('div');
        searchItem.classList.add('favorite-item'); // Reusing style, consider new class for clarity
        let queryDetails = [];
        if (search.location) queryDetails.push(`Location: ${search.location}`);
        if (search.propertyType) queryDetails.push(`Type: ${search.propertyType}`);
        // Ensure price ranges are correctly displayed, handling Infinity/0
        const minPriceStr = search.minPrice > 0 ? `KSh ${search.minPrice.toLocaleString()}` : '0';
        const maxPriceStr = search.maxPrice !== undefined && search.maxPrice !== null && search.maxPrice !== Infinity ? ` - ${search.maxPrice.toLocaleString()}` : '';
        if (search.minPrice > 0 || (search.maxPrice !== undefined && search.maxPrice !== null && search.maxPrice !== Infinity)) {
             queryDetails.push(`Price: ${minPriceStr}${maxPriceStr}`);
        }
        if (search.bedrooms) queryDetails.push(`Bedrooms: ${search.bedrooms}`);

        searchItem.innerHTML = `
            <span>${queryDetails.join(', ')} (${new Date(search.timestamp).toLocaleString()})</span>
            <button class="remove-favorite" onclick="removeSearchFromHistory('${search._id}')">
                <i class="fas fa-times"></i>
            </button>
        `;
        historyList.appendChild(searchItem);
    });
}

async function removeSearchFromHistory(id) {
    if (!currentUser) return;
    const token = localStorage.getItem('authToken');
    if (!token) return;

    try {
        const response = await fetch(`${backendUrl}/users/${currentUser.id}/history/${id}`, {
            method: 'DELETE',
            headers: {
                'x-auth-token': token
            }
        });

        const data = await response.json();
        if (response.ok) {
            searchHistory = searchHistory.filter(search => search._id !== id); // Filter using backend _id
            populateSearchHistory();
            showNotification('Search history entry removed.', 'info');
        } else {
            showNotification(data.msg || 'Failed to remove search from history.', 'error');
            console.error('Error removing search history:', data.msg);
        }
    } catch (error) {
        console.error('Network error removing search from history:', error);
        showNotification('An error occurred. Please try again.', 'error');
    }
}

// --- User Preferences ---
function populatePreferencesForm() {
    document.getElementById('prefBudget').value = userPreferences.budget || '';
    document.getElementById('prefLocation').value = userPreferences.location || '';
    document.getElementById('prefType').value = userPreferences.type || '';
}

async function savePreferences() {
    if (!currentUser) {
        showNotification('Please login to save preferences.', 'info');
        openModal('loginModal');
        return;
    }

    const token = localStorage.getItem('authToken');
    if (!token) {
        showNotification('You need to be logged in to save preferences.', 'error');
        return;
    }

    const newPreferences = {
        budget: document.getElementById('prefBudget').value,
        location: document.getElementById('prefLocation').value,
        type: document.getElementById('prefType').value
    };

    try {
        const response = await fetch(`${backendUrl}/users/${currentUser.id}/preferences`, {
            method: 'PUT', // or POST if you always replace, PUT is typical for full updates
            headers: {
                'Content-Type': 'application/json',
                'x-auth-token': token
            },
            body: JSON.stringify(newPreferences)
        });

        const data = await response.json();
        if (response.ok) {
            userPreferences = data.preferences; // Update local state with what backend confirmed
            showNotification('Preferences saved successfully!', 'success');
            // Re-generate recommendations after preferences are updated
            generateAIRecommendations();
        } else {
            showNotification(data.msg || 'Failed to save preferences.', 'error');
            console.error('Error saving preferences:', data.msg);
        }
    } catch (error) {
        console.error('Network error saving preferences:', error);
        showNotification('An error occurred. Please try again.', 'error');
    }
}

// --- AI Recommendations (needs backend AI logic) ---
async function generateAIRecommendations() {
    const recommendationsContainer = document.getElementById('aiRecommendations');
    recommendationsContainer.innerHTML = '<p class="text-center">Loading AI recommendations...</p>'; // Show loading message

    let requestBody = {};
    let headers = { 'Content-Type': 'application/json' };

    // Include user-specific data if logged in
    if (currentUser) {
        const token = localStorage.getItem('authToken');
        if (token) {
            headers['x-auth-token'] = token;
        }
        requestBody = {
            userId: currentUser.id,
            preferences: userPreferences,
            searchHistory: searchHistory,
            favoriteProperties: favoriteProperties
        };
    } else {
        // For non-logged-in users, you might send general demographic data or popular properties
        // For now, we'll indicate it's general or fallback.
        requestBody = {
            message: "Fetching general recommendations for non-logged-in user."
        };
    }

    try {
        const response = await fetch(`${backendUrl}/properties/recommendations`, { // Assuming this is your AI service endpoint
            method: 'POST', // Use POST to send user data
            headers: headers,
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();

        if (response.ok) {
            if (data.properties && data.properties.length > 0) {
                displayProperties(data.properties, 'aiRecommendations');
            } else {
                recommendationsContainer.innerHTML = '<p class="text-center">No personalized recommendations available at this time. Here are some popular listings:</p>';
                // Fallback to displaying a few general properties if AI returns no results
                displayProperties(allProperties.slice(0, 3), 'aiRecommendations');
            }
        } else {
            console.warn('Failed to fetch AI recommendations from backend:', data.msg || response.statusText);
            recommendationsContainer.innerHTML = '<p class="text-center">Could not fetch personalized recommendations. Displaying general properties.</p>';
            displayProperties(allProperties.slice(0, 3), 'aiRecommendations'); // Fallback
        }
    } catch (error) {
        console.error('Error fetching AI recommendations:', error);
        recommendationsContainer.innerHTML = '<p class="text-center">An error occurred while fetching recommendations. Displaying general properties.</p>';
        displayProperties(allProperties.slice(0, 3), 'aiRecommendations'); // Fallback
    }
}


// --- Map Integration (Placeholder) ---
function loadMap() {
    showNotification('Loading map... (Map integration coming soon!)', 'info');
    // Here you would typically initialize a Google Maps or OpenStreetMap instance
    // and add markers for the properties based on their coordinates.
    // You would need to include the Google Maps API script in your HTML and use an API key.
    /*
    const mapPlaceholder = document.querySelector('.map-placeholder');
    mapPlaceholder.innerHTML = '<div id="map" style="width: 100%; height: 100%; border-radius: 15px;"></div>';

    // Example Google Maps init (requires API key in index.html script tag)
    // function initMap() {
    //    const map = new google.maps.Map(document.getElementById("map"), {
    //        center: { lat: -1.286389, lng: 36.817223 }, // Nairobi coordinates
    //        zoom: 12,
    //    });
    //    allProperties.forEach(property => {
    //        if (property.coordinates) {
    //            new google.maps.Marker({
    //                position: property.coordinates,
    //                map: map,
    //                title: property.title,
    //            });
    //        }
    //    });
    // }
    // Call initMap() after the script loads, or dynamically load the script
    */
}

// --- Load User Data from Backend ---
async function loadUserData() {
    if (!currentUser || !localStorage.getItem('authToken')) {
        // No user logged in or no token, nothing to load from backend
        favoriteProperties = [];
        searchHistory = [];
        userPreferences = {};
        populateFavorites();
        populateSearchHistory();
        populatePreferencesForm();
        updatePropertyCardFavoriteButtons();
        generateAIRecommendations(); // Generate general recommendations if no user
        return;
    }

    const token = localStorage.getItem('authToken');

    try {
        // Fetch Favorites
        const favsResponse = await fetch(`${backendUrl}/users/${currentUser.id}/favorites`, {
            headers: { 'x-auth-token': token }
        });
        if (favsResponse.ok) {
            favoriteProperties = await favsResponse.json();
            populateFavorites();
        } else {
            console.error('Failed to fetch favorites:', await favsResponse.json());
            favoriteProperties = [];
        }

        // Fetch Search History
        const historyResponse = await fetch(`${backendUrl}/users/${currentUser.id}/history`, {
            headers: { 'x-auth-token': token }
        });
        if (historyResponse.ok) {
            searchHistory = await historyResponse.json();
            populateSearchHistory();
        } else {
            console.error('Failed to fetch search history:', await historyResponse.json());
            searchHistory = [];
        }

        // Fetch User Preferences
        const prefsResponse = await fetch(`${backendUrl}/users/${currentUser.id}/preferences`, {
            headers: { 'x-auth-token': token }
        });
        if (prefsResponse.ok) {
            userPreferences = await prefsResponse.json();
            populatePreferencesForm();
        } else {
            console.error('Failed to fetch user preferences:', await prefsResponse.json());
            userPreferences = {};
        }

        // After all user data is loaded, then generate AI recommendations
        generateAIRecommendations();
        updatePropertyCardFavoriteButtons(); // Update buttons on main grid based on fetched favorites

    } catch (error) {
        console.error('Network error loading user data:', error);
        showNotification('Failed to load user data. Please check your connection.', 'error');
        // Even on error, attempt to generate general recommendations
        generateAIRecommendations();
    }
}
        if (favsResponse.ok) {
            favoriteProperties = await favsResponse.json();
            // Assuming favoriteProperties is an array of IDs from backend
        } else {
            console.error('Failed to load favorites:', await favsResponse.json());
            favoriteProperties = [];
        }

        // Fetch Search History
        const historyResponse = await fetch(`${backendUrl}/users/${currentUser.id}/history`, {
            headers: { 'x-auth-token': token }
        });
        if (historyResponse.ok) {
            searchHistory = await historyResponse.json();
        } else {
            console.error('Failed to load search history:', await historyResponse.json());
            searchHistory = [];
        }

        // Fetch Preferences
        const prefsResponse = await fetch(`${backendUrl}/users/${currentUser.id}/preferences`, {
            headers: { 'x-auth-token': token }
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