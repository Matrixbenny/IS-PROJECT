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
        imageUrl: "images/properties/apartment-westlands.jpg"
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
        imageUrl: "images/properties/house-karen.jpg"
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
        imageUrl: "images/properties/studio-kilimani.jpg"
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
        imageUrl: "images/properties/office.jpg"
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
        imageUrl: "images/properties/Office.jpg"
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
        imageUrl: "images/properties/townhouse lavington.jpg"
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
            // e.g., const response = await fetch(`${backendUrl}/auth/verify`, {
            //     headers: { 'x-auth-token': token }
            // });
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
            <p class="property-price">KSh ${property.price.toLocaleString()}/month</p>
            <div class="property-features">
                <span class="feature"><i class="fas fa-bed"></i> ${property.bedrooms} Beds</span>
                <span class="feature"><i class="fas fa-bath"></i> ${property.bathrooms} Bath</span>
                ${property.features.map(feature => `<span class="feature">${feature}</span>`).join('')}
            </div>
            <div class="property-actions">
                <button class="btn btn-primary btn-small" onclick="viewPropertyDetails('${property.id}')">View Details</button>
                <button class="btn btn-secondary btn-small favorite-btn" data-property-id="${property.id}" onclick="toggleFavorite(event, '${property.id}')">
                    <i class="fas fa-heart"></i>
                </button>
            </div>
        </div>
    `;
    return card;
}

function displayProperties(properties, targetElementId = 'propertiesGrid') {
    const propertiesGrid = document.getElementById(targetElementId);
    if (!propertiesGrid) {
        console.error(`Target element with ID "${targetElementId}" not found.`);
        return;
    }
    propertiesGrid.innerHTML = ''; // Clear existing content

    if (properties && properties.length > 0) {
        properties.forEach(property => {
            propertiesGrid.appendChild(createPropertyCard(property));
        });
        updatePropertyCardFavoriteButtons(); // Ensure heart icons are correct
    } else {
        propertiesGrid.innerHTML = '<p class="text-center">No properties to display at the moment.</p>';
    }
}

function viewPropertyDetails(propertyId) {
    // In a real application, this would navigate to a detailed property page
    // For now, we'll just show an alert with some details.
    const property = allProperties.find(p => p.id === propertyId);
    if (property) {
        alert(`
            Property Details:
            Title: ${property.title}
            Location: ${property.location}
            Price: KSh ${property.price.toLocaleString()}/month
            Beds: ${property.bedrooms}
            Baths: ${property.bathrooms}
            Features: ${property.features.join(', ')}
            Description: ${property.description}
        `);
    } else {
        showNotification('Property not found.', 'error');
    }
}


// --- Search & Filter Functions ---
function applyFilters() {
    const location = document.getElementById('filterLocation').value.toLowerCase();
    const type = document.getElementById('filterType').value.toLowerCase();
    const minPrice = parseFloat(document.getElementById('filterMinPrice').value) || 0;
    const maxPrice = parseFloat(document.getElementById('filterMaxPrice').value) || Infinity;
    const beds = parseInt(document.getElementById('filterBeds').value) || 0;
    const baths = parseInt(document.getElementById('filterBaths').value) || 0;

    const filteredProperties = allProperties.filter(property => {
        const matchesLocation = location === '' || property.location.toLowerCase().includes(location);
        const matchesType = type === '' || property.type.toLowerCase() === type;
        const matchesPrice = property.price >= minPrice && property.price <= maxPrice;
        const matchesBeds = beds === 0 || property.bedrooms >= beds;
        const matchesBaths = baths === 0 || property.bathrooms >= baths;

        return matchesLocation && matchesType && matchesPrice && matchesBeds && matchesBaths;
    });

    displayProperties(filteredProperties);
    saveSearchHistory(location, type, minPrice, maxPrice, beds, baths); // Save applied filters to history
}

function clearFilters() {
    document.getElementById('filterLocation').value = '';
    document.getElementById('filterType').value = '';
    document.getElementById('filterMinPrice').value = '';
    document.getElementById('filterMaxPrice').value = '';
    document.getElementById('filterBeds').value = '';
    document.getElementById('filterBaths').value = '';
    displayProperties(allProperties); // Display all properties again
}

// --- Dashboard Functions ---
function showDashboard() {
    if (!currentUser) {
        showNotification('Please log in to access your dashboard.', 'info');
        openModal('loginModal');
        return;
    }
    document.getElementById('dashboardSection').classList.remove('hidden');
    document.getElementById('mainContent').classList.add('hidden'); // Hide main content
    switchDashboardTab('favorites'); // Default to favorites tab
}

function hideDashboard() {
    document.getElementById('dashboardSection').classList.add('hidden');
    document.getElementById('mainContent').classList.remove('hidden'); // Show main content
}

function switchDashboardTab(tabName) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.style.display = 'none';
    });

    // Deactivate all tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Show the selected tab content and activate its button
    document.getElementById(`${tabName}Content`).style.display = 'block';
    document.querySelector(`.tab-btn[onclick="switchDashboardTab('${tabName}')"]`).classList.add('active');

    // Populate content based on tab
    if (tabName === 'favorites') {
        populateFavorites();
    } else if (tabName === 'history') {
        populateSearchHistory();
    } else if (tabName === 'preferences') {
        populatePreferencesForm();
    }
}

// --- Favorites Management ---
async function toggleFavorite(event, propertyId) {
    event.stopPropagation(); // Prevent card click event from firing

    if (!currentUser) {
        showNotification('Please log in to add favorites.', 'info');
        openModal('loginModal');
        return;
    }

    const isFavorite = favoriteProperties.some(fav => fav.propertyId === propertyId);
    const method = isFavorite ? 'DELETE' : 'POST';
    const url = isFavorite ? `${backendUrl}/users/${currentUser.id}/favorites/${propertyId}` : `${backendUrl}/users/${currentUser.id}/favorites`;
    const body = isFavorite ? null : JSON.stringify({ propertyId });

    try {
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}` // Send token
            },
            body: body
        });

        const data = await response.json();

        if (response.ok) {
            // Update local favoriteProperties array based on the backend's response
            await loadUserData(); // Reload all user data (favorites, history, etc.) after action
            showNotification(isFavorite ? 'Removed from favorites.' : 'Added to favorites!', 'success');
            // The `updatePropertyCardFavoriteButtons()` will be called by `populateFavorites()` which `loadUserData()` calls.
        } else {
            showNotification(data.msg || 'Failed to update favorites.', 'error');
            console.error('Favorite update error:', data.msg);
        }
    } catch (error) {
        console.error('Network error updating favorites:', error);
        showNotification('An error occurred. Please try again.', 'error');
    }
}


function populateFavorites() {
    const favoritesGrid = document.getElementById('favoritesGrid');
    if (!favoritesGrid) return;
    favoritesGrid.innerHTML = ''; // Clear current favorites display

    if (favoriteProperties.length === 0) {
        favoritesGrid.innerHTML = '<p class="text-center">You have no favorite properties yet. Start Browse!</p>';
        return;
    }

    const favoritePropertyObjects = allProperties.filter(property =>
        favoriteProperties.some(fav => fav.propertyId === property.id)
    );

    if (favoritePropertyObjects.length > 0) {
        favoritePropertyObjects.forEach(property => {
            favoritesGrid.appendChild(createPropertyCard(property));
        });
    } else {
        favoritesGrid.innerHTML = '<p class="text-center">No favorite properties found matching available properties.</p>';
    }
    updatePropertyCardFavoriteButtons(); // Ensure favorite icons are correct after populating
}


function updatePropertyCardFavoriteButtons() {
    document.querySelectorAll('.property-card .favorite-btn').forEach(button => {
        const propertyId = button.dataset.propertyId;
        if (favoriteProperties.some(fav => fav.propertyId === propertyId)) {
            button.classList.add('active'); // Add a class for styling (e.g., red heart)
            button.querySelector('i').classList.remove('far'); // outline heart
            button.querySelector('i').classList.add('fas'); // solid heart
        } else {
            button.classList.remove('active');
            button.querySelector('i').classList.remove('fas');
            button.querySelector('i').classList.add('far');
        }
    });
}


// --- Search History Management ---
async function saveSearchHistory(location, type, minPrice, maxPrice, beds, baths) {
    if (!currentUser) return; // Only save history for logged-in users

    const newSearch = {
        location,
        type,
        minPrice,
        maxPrice,
        beds,
        baths,
        timestamp: new Date().toISOString()
    };

    try {
        const response = await fetch(`${backendUrl}/users/${currentUser.id}/search-history`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify(newSearch)
        });

        const data = await response.json();
        if (response.ok) {
            searchHistory = data.searchHistory; // Update local state with latest from backend
            populateSearchHistory();
            console.log('Search history saved:', newSearch);
        } else {
            console.error('Failed to save search history:', data.msg);
        }
    } catch (error) {
        console.error('Network error saving search history:', error);
    }
}


function populateSearchHistory() {
    const searchHistoryList = document.getElementById('searchHistoryList');
    if (!searchHistoryList) return;
    searchHistoryList.innerHTML = ''; // Clear current history display

    if (searchHistory.length === 0) {
        searchHistoryList.innerHTML = '<p>No search history yet.</p>';
        return;
    }

    // Display most recent searches first
    [...searchHistory].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).forEach(search => {
        const listItem = document.createElement('li');
        listItem.classList.add('search-history-item');
        listItem.innerHTML = `
            <span>
                <strong>Location:</strong> ${search.location || 'Any'},
                <strong>Type:</strong> ${search.type || 'Any'},
                <strong>Price:</strong> KSh ${search.minPrice || 0} - ${search.maxPrice === Infinity ? 'Any' : search.maxPrice},
                <strong>Beds:</strong> ${search.beds || 'Any'},
                <strong>Baths:</strong> ${search.baths || 'Any'}
            </span>
            <button class="btn btn-secondary btn-small" onclick="applySearchFromHistory('${search.location}', '${search.type}', ${search.minPrice}, ${search.maxPrice}, ${search.beds}, ${search.baths})">Apply</button>
            <button class="btn btn-danger btn-small" onclick="removeSearchHistoryItem('${search._id}')">Remove</button>
        `;
        searchHistoryList.appendChild(listItem);
    });
}

function applySearchFromHistory(location, type, minPrice, maxPrice, beds, baths) {
    document.getElementById('filterLocation').value = location;
    document.getElementById('filterType').value = type;
    document.getElementById('filterMinPrice').value = minPrice > 0 ? minPrice : '';
    document.getElementById('filterMaxPrice').value = maxPrice !== Infinity ? maxPrice : '';
    document.getElementById('filterBeds').value = beds > 0 ? beds : '';
    document.getElementById('filterBaths').value = baths > 0 ? baths : '';
    applyFilters(); // Re-apply the filters to update the main property display
    showNotification('Applied search from history.', 'info');
}

async function removeSearchHistoryItem(historyId) {
    if (!currentUser) {
        showNotification('Please log in to manage search history.', 'info');
        return;
    }

    try {
        const response = await fetch(`${backendUrl}/users/${currentUser.id}/search-history/${historyId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });

        const data = await response.json();
        if (response.ok) {
            searchHistory = data.searchHistory; // Update local state
            populateSearchHistory();
            showNotification('Search history item removed.', 'success');
        } else {
            showNotification(data.msg || 'Failed to remove search history item.', 'error');
            console.error('Remove history error:', data.msg);
        }
    } catch (error) {
        console.error('Network error removing search history:', error);
    }
}


// --- User Preferences Management ---
async function savePreferences(event) {
    event.preventDefault();
    if (!currentUser) {
        showNotification('Please log in to save preferences.', 'info');
        return;
    }

    const preferredLocation = document.getElementById('prefLocation').value;
    const preferredType = document.getElementById('prefType').value;
    const preferredMinPrice = parseFloat(document.getElementById('prefMinPrice').value) || 0;
    const preferredMaxPrice = parseFloat(document.getElementById('prefMaxPrice').value) || Infinity;
    const preferredBeds = parseInt(document.getElementById('prefBeds').value) || 0;
    const preferredBaths = parseInt(document.getElementById('prefBaths').value) || 0;
    const preferredFeatures = Array.from(document.querySelectorAll('#preferencesForm input[name="prefFeatures"]:checked')).map(cb => cb.value);

    const newPreferences = {
        location: preferredLocation,
        type: preferredType,
        minPrice: preferredMinPrice,
        maxPrice: preferredMaxPrice,
        beds: preferredBeds,
        baths: preferredBaths,
        features: preferredFeatures
    };

    try {
        const response = await fetch(`${backendUrl}/users/${currentUser.id}/preferences`, {
            method: 'PUT', // Use PUT to replace or create preferences
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify(newPreferences)
        });

        const data = await response.json();
        if (response.ok) {
            userPreferences = data.preferences; // Update local state
            showNotification('Preferences saved successfully!', 'success');
            generateAIRecommendations(); // Regenerate AI recommendations with new preferences
        } else {
            showNotification(data.msg || 'Failed to save preferences.', 'error');
            console.error('Save preferences error:', data.msg);
        }
    } catch (error) {
        console.error('Network error saving preferences:', error);
        showNotification('An error occurred while saving preferences. Please try again.', 'error');
    }
}


function populatePreferencesForm() {
    if (!currentUser) return; // Form should only be active for logged-in users

    document.getElementById('prefLocation').value = userPreferences.location || '';
    document.getElementById('prefType').value = userPreferences.type || '';
    document.getElementById('prefMinPrice').value = userPreferences.minPrice && userPreferences.minPrice > 0 ? userPreferences.minPrice : '';
    document.getElementById('prefMaxPrice').value = userPreferences.maxPrice && userPreferences.maxPrice !== Infinity ? userPreferences.maxPrice : '';
    document.getElementById('prefBeds').value = userPreferences.beds && userPreferences.beds > 0 ? userPreferences.beds : '';
    document.getElementById('prefBaths').value = userPreferences.baths && userPreferences.baths > 0 ? userPreferences.baths : '';

    // Clear all feature checkboxes first
    document.querySelectorAll('#preferencesForm input[name="prefFeatures"]').forEach(checkbox => {
        checkbox.checked = false;
    });
    // Check features based on saved preferences
    if (userPreferences.features) {
        userPreferences.features.forEach(feature => {
            const checkbox = document.querySelector(`#preferencesForm input[name="prefFeatures"][value="${feature}"]`);
            if (checkbox) checkbox.checked = true;
        });
    }
}


// --- AI Recommendations ---
async function generateAIRecommendations() {
    const aiRecommendationsGrid = document.getElementById('aiRecommendations');
    if (!aiRecommendationsGrid) return;
    aiRecommendationsGrid.innerHTML = ''; // Clear previous recommendations

    if (!currentUser && allProperties.length > 0) {
        // If not logged in, display a few random properties or first few
        aiRecommendationsGrid.innerHTML = '<h3 class="text-center mb-3">Login to get personalized recommendations!</h3>';
        displayProperties(allProperties.slice(0, 3), 'aiRecommendations'); // Show first 3 as general examples
        return;
    }

    if (!currentUser) { // Should not happen if allProperties is empty, but for safety
        aiRecommendationsGrid.innerHTML = '<p class="text-center">Please log in to see personalized recommendations.</p>';
        return;
    }

    // Send preferences and optionally search history to the backend for AI processing
    // For this example, we'll simulate AI based on simple preference matching
    // In a real scenario, this would be an API call to your AI service
    try {
        const response = await fetch(`${backendUrl}/recommendations`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify({
                userId: currentUser.id,
                preferences: userPreferences,
                searchHistory: searchHistory // Send history for more context
            })
        });

        const data = await response.json();
        if (response.ok) {
            const recommendations = data.recommendations;
            if (recommendations && recommendations.length > 0) {
                displayProperties(recommendations, 'aiRecommendations');
            } else {
                aiRecommendationsGrid.innerHTML = '<p class="text-center">No personalized recommendations based on your preferences yet. Try adjusting them!</p>';
                // Optionally show some general properties if no specific recommendations
                if (allProperties.length > 0) {
                    displayProperties(allProperties.slice(0, 3), 'aiRecommendations');
                }
            }
        } else {
            console.error('Failed to fetch AI recommendations:', data.msg);
            aiRecommendationsGrid.innerHTML = '<p class="text-center">Failed to load personalized recommendations. Showing general properties.</p>';
            if (allProperties.length > 0) {
                displayProperties(allProperties.slice(0, 3), 'aiRecommendations');
            }
        }
    } catch (error) {
        console.error('Network error fetching AI recommendations:', error);
        aiRecommendationsGrid.innerHTML = '<p class="text-center">An error occurred while fetching recommendations. Showing general properties.</p>';
        if (allProperties.length > 0) {
            displayProperties(allProperties.slice(0, 3), 'aiRecommendations');
        }
    }
}

// --- Load User Data (called on login and app start if logged in) ---
async function loadUserData() {
    if (!currentUser || !currentUser.id) {
        console.log('No current user to load data for.');
        return;
    }
    const token = localStorage.getItem('authToken');
    if (!token) {
        console.log('No auth token found. Cannot load user data.');
        return;
    }

    try {
        // Fetch Favorites
        const favResponse = await fetch(`${backendUrl}/users/${currentUser.id}/favorites`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (favResponse.ok) {
            favoriteProperties = await favResponse.json();
        } else {
            console.error('Failed to load favorites:', await favResponse.json());
            favoriteProperties = [];
        }

        // Fetch Search History
        const historyResponse = await fetch(`${backendUrl}/users/${currentUser.id}/search-history`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (historyResponse.ok) {
            searchHistory = await historyResponse.json();
        } else {
            console.error('Failed to load search history:', await historyResponse.json());
            searchHistory = [];
        }

        // Fetch Preferences
        const prefsResponse = await fetch(`${backendUrl}/users/${currentUser.id}/preferences`, {
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
    generateAIRecommendations(); // Generate AI recommendations after user data is loaded
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

    const preferencesForm = document.getElementById('preferencesForm');
    if (preferencesForm) {
        preferencesForm.addEventListener('submit', savePreferences);
    }
});

// Original functions that were intercepted are no longer needed as direct backend calls handle saving
// For example, toggleFavorite now directly calls the backend, which updates `favoriteProperties`
// via `loadUserData`, so `saveFavorites()` is implicitly handled by the backend.
// This simplifies the client-side state management significantly.