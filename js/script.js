// Application State (Initialize from localStorage on load)
let currentUser = JSON.parse(localStorage.getItem('user')) || null;
let searchHistory = JSON.parse(localStorage.getItem('searchHistory')) || []; // Will be loaded from/saved to backend for current user
let favoriteProperties = JSON.parse(localStorage.getItem('favoriteProperties')) || []; // Will be loaded from/saved to backend for current user
let allProperties = []; // This will eventually be fetched from the backend or kept client-side for initial load
let userPreferences = JSON.parse(localStorage.getItem('userPreferences')) || {}; // Will be loaded from/saved to backend for current user

// --- Backend API Base URL ---
// This must consistently match your backend server's address
const backendUrl = 'http://localhost:5000/api';

// Sample Property Data (will be replaced by backend data or initially loaded)
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
        imageUrl: "images/properties/apartment_westlands.jpg"
    },
    {
        id: "prop2",
        title: "Spacious Family House",
        location: "Karen, Nairobi",
        price: 150000,
        type: "house",
        bedrooms: 4,
        bathrooms: 3,
        features: ["Garden", "Garage", "Pet-Friendly"],
        coordinates: { lat: -1.3129, lng: 36.6841 },
        description: "Large family home in a serene Karen neighborhood with a lush garden.",
        imageUrl: "https://via.placeholder.com/400x200/667eea/ffffff?text=House+Image"
    },
    {
        id: "prop3",
        title: "Studio Apartment",
        location: "Kilimani, Nairobi",
        price: 45000,
        type: "apartment",
        bedrooms: 1, // Studio counts as 1 bed for simplicity
        bathrooms: 1,
        features: ["Balcony", "Furnished"],
        coordinates: { lat: -1.2905, lng: 36.7869 },
        description: "Cozy studio ideal for young professionals, close to amenities.",
        imageUrl: "https://via.placeholder.com/400x200/667eea/ffffff?text=Studio+Image"
    },
    {
        id: "prop4",
        title: "Commercial Office Space",
        location: "Upper Hill, Nairobi",
        price: 200000,
        type: "commercial",
        bedrooms: null, // N/A for commercial
        bathrooms: 1,
        features: ["High-speed Internet", "Meeting Rooms"],
        coordinates: { lat: -1.2891, lng: 36.8197 },
        description: "Prime office space suitable for growing businesses.",
        imageUrl: "https://via.placeholder.com/400x200/667eea/ffffff?text=Office+Space"
    },
    {
        id: "prop5",
        title: "3-Bedroom Townhouse",
        location: "Lavington, Nairobi",
        price: 120000,
        type: "townhouse",
        bedrooms: 3,
        bathrooms: 2,
        features: ["Gated Community", "Backyard"],
        coordinates: { lat: -1.2831, lng: 36.7645 },
        description: "Family-friendly townhouse in a secure gated community.",
        imageUrl: "https://via.placeholder.com/400x200/667eea/ffffff?text=Townhouse+Image"
    }
];


// --- Helper Functions (Shared across pages) ---

// This function needs to be able to be called from any page to update the header
function updateAuthUI() {
    const authButtons = document.getElementById('authButtons');
    const userMenu = document.getElementById('userMenu');
    const userAvatarDisplay = document.getElementById('userAvatarDisplay'); // Assume an element for avatar/name
    const userNameDisplay = document.getElementById('userNameDisplay'); // Assume an element for avatar/name


    // Re-read currentUser from localStorage to ensure state is fresh
    currentUser = JSON.parse(localStorage.getItem('user'));

    if (authButtons && userMenu) { // Ensure elements exist on the page
        if (currentUser) {
            authButtons.classList.add('hidden');
            userMenu.classList.remove('hidden');
            if (userAvatarDisplay) {
                userAvatarDisplay.textContent = currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U';
            }
            if (userNameDisplay) {
                userNameDisplay.textContent = currentUser.name || 'User';
            }
        } else {
            authButtons.classList.remove('hidden');
            userMenu.classList.add('hidden');
        }
    }
}

// Function to check login status on page load (calls updateAuthUI)
function checkLoginStatus() {
    updateAuthUI();
    // If a user is logged in, attempt to load their specific data
    if (currentUser) {
        loadUserData();
    }
}

// Function to show user dashboard (dummy for now)
function showDashboard() {
    // In a real application, this would redirect to a dashboard page
    // For now, let's just show a notification or redirect to index
    if (currentUser) {
        showNotification(`Welcome to your Dashboard, ${currentUser.name}!`, 'info');
        // window.location.href = 'dashboard.html'; // Uncomment when dashboard page exists
    } else {
        showNotification('Please log in to view your dashboard.', 'warning');
        window.location.href = 'login.html';
    }
}


// Function to display properties (from sample data or fetched data)
function displayProperties(properties, gridId) {
    const grid = document.getElementById(gridId);
    if (!grid) return; // Exit if the grid element doesn't exist

    grid.innerHTML = ''; // Clear existing properties

    if (properties.length === 0) {
        grid.innerHTML = '<p class="text-center">No properties to display.</p>';
        return;
    }

    properties.forEach(property => {
        const isFavorite = favoriteProperties.some(fav => fav.id === property.id);
        const favoriteClass = isFavorite ? 'fas' : 'far'; // fas for solid, far for regular

        const propertyCard = `
            <div class="property-card" data-id="${property.id}">
                <div class="property-image" style="background-image: url('${property.imageUrl}');">
                    <button class="favorite-btn" data-id="${property.id}" onclick="toggleFavorite('${property.id}')">
                        <i class="${favoriteClass} fa-heart"></i>
                    </button>
                </div>
                <div class="property-info">
                    <h3 class="property-title">${property.title}</h3>
                    <p class="property-location"><i class="fas fa-map-marker-alt"></i> ${property.location}</p>
                    <p class="property-price">KSh ${property.price.toLocaleString()}/month</p>
                    <div class="property-features">
                        ${property.bedrooms ? `<span class="feature"><i class="fas fa-bed"></i> ${property.bedrooms} Beds</span>` : ''}
                        ${property.bathrooms ? `<span class="feature"><i class="fas fa-bath"></i> ${property.bathrooms} Bath</span>` : ''}
                    </div>
                    <div class="property-actions">
                        <button class="btn btn-primary btn-small" onclick="viewPropertyDetails('${property.id}')">View Details</button>
                    </div>
                </div>
            </div>
        `;
        grid.insertAdjacentHTML('beforeend', propertyCard);
    });
    updatePropertyCardFavoriteButtons(); // Ensure correct favorite status after display
}

// Function to update the favorite icon on property cards
function updatePropertyCardFavoriteButtons() {
    document.querySelectorAll('.favorite-btn').forEach(button => {
        const propertyId = button.dataset.id;
        const icon = button.querySelector('i');
        const isFavorite = favoriteProperties.some(fav => fav.id === propertyId);

        if (icon) {
            if (isFavorite) {
                icon.classList.remove('far');
                icon.classList.add('fas');
            } else {
                icon.classList.remove('fas');
                icon.classList.add('far');
            }
        }
    });
}

// Function to toggle a property as favorite
async function toggleFavorite(propertyId) {
    if (!currentUser) {
        showNotification('Please log in to add favorites.', 'warning');
        window.location.href = 'login.html';
        return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
        showNotification('Authentication token missing. Please log in again.', 'error');
        window.location.href = 'login.html';
        return;
    }

    try {
        const response = await fetch(`${backendUrl}/user/favorites/toggle`, { // Assuming a backend endpoint for favorites
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ userId: currentUser.id, propertyId }) // Send user ID and property ID
        });

        const data = await response.json();

        if (response.ok) {
            // Re-fetch user data to update favoriteProperties locally
            await loadUserData();
            showNotification(data.message, 'success');
        } else {
            showNotification(`Failed to update favorites: ${data.message || 'Server error.'}`, 'error');
        }
    } catch (error) {
        console.error('Error toggling favorite:', error);
        showNotification('An error occurred while updating favorites.', 'error');
    }
}

// Dummy function for viewing property details (to be implemented later)
function viewPropertyDetails(propertyId) {
    showNotification(`Viewing details for property: ${propertyId}`, 'info');
    // window.location.href = `property-detail.html?id=${propertyId}`;
}

// Function to handle search form submission
async function handleSearch(event) {
    event.preventDefault();
    const location = document.getElementById('location').value;
    const minPrice = document.getElementById('minPrice').value;
    const maxPrice = document.getElementById('maxPrice').value;
    const propertyType = document.getElementById('propertyType').value;
    const bedrooms = document.getElementById('bedrooms').value;
    const bathrooms = document.getElementById('bathrooms').value;

    const queryParams = new URLSearchParams();
    if (location) queryParams.append('location', location);
    if (minPrice) queryParams.append('minPrice', minPrice);
    if (maxPrice) queryParams.append('maxPrice', maxPrice);
    if (propertyType) queryParams.append('type', propertyType);
    if (bedrooms) queryParams.append('bedrooms', bedrooms);
    if (bathrooms) queryParams.append('bathrooms', bathrooms);

    try {
        // Here you would typically fetch properties from your backend
        // For now, filter sample data client-side or fetch from a dummy endpoint
        showNotification('Searching properties...', 'info');
        
        // Example of fetching from backend:
        // const response = await fetch(`${backendUrl}/properties?${queryParams.toString()}`);
        // const data = await response.json();
        // allProperties = data.properties; // Update allProperties with fetched data
        
        // Simulating backend fetch with client-side filtering for now:
        let filteredProperties = sampleProperties.filter(property => {
            const matchesLocation = !location || property.location.toLowerCase().includes(location.toLowerCase());
            const matchesMinPrice = !minPrice || property.price >= parseInt(minPrice);
            const matchesMaxPrice = !maxPrice || property.price <= parseInt(maxPrice);
            const matchesType = !propertyType || property.type === propertyType;
            const matchesBedrooms = !bedrooms || property.bedrooms >= parseInt(bedrooms);
            const matchesBathrooms = !bathrooms || property.bathrooms >= parseInt(bathrooms);
            return matchesLocation && matchesMinPrice && matchesMaxPrice && matchesType && matchesBedrooms && matchesBathrooms;
        });

        displayProperties(filteredProperties, 'propertiesGrid'); // Display search results
        showNotification('Search complete!', 'success');

        // Add to search history (if logged in)
        if (currentUser) {
            const searchItem = {
                query: location || 'All Locations',
                timestamp: new Date().toISOString(),
                criteria: { location, minPrice, maxPrice, propertyType, bedrooms, bathrooms }
            };
            // This should ideally be saved to backend. For now, local only.
            searchHistory.unshift(searchItem); // Add to the beginning
            searchHistory = searchHistory.slice(0, 5); // Keep last 5 searches
            populateSearchHistory(); // Update UI
            localStorage.setItem('searchHistory', JSON.stringify(searchHistory)); // Save locally
            // In a real app, send to backend: await fetch(`${backendUrl}/user/search-history`, { ... });
        }

    } catch (error) {
        console.error('Error during search:', error);
        showNotification('An error occurred during search. Please try again.', 'error');
    }
}

// Function to load user-specific data from backend
async function loadUserData() {
    const token = localStorage.getItem('token');
    if (!token) {
        // User not logged in, no specific data to load from backend
        // Initialize with empty arrays/objects if not already done by localStorage.getItem
        favoriteProperties = JSON.parse(localStorage.getItem('favoriteProperties')) || [];
        searchHistory = JSON.parse(localStorage.getItem('searchHistory')) || [];
        userPreferences = JSON.parse(localStorage.getItem('userPreferences')) || {};
        return;
    }

    try {
        // Fetch favorites
        const favoritesResponse = await fetch(`${backendUrl}/user/favorites`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (favoritesResponse.ok) {
            const data = await favoritesResponse.json();
            favoriteProperties = data.favorites || [];
            localStorage.setItem('favoriteProperties', JSON.stringify(favoriteProperties));
        } else {
            console.error('Failed to load favorites:', await favoritesResponse.json());
            favoriteProperties = [];
            localStorage.removeItem('favoriteProperties');
        }

        // Fetch search history
        const historyResponse = await fetch(`${backendUrl}/user/search-history`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (historyResponse.ok) {
            const data = await historyResponse.json();
            searchHistory = data.history || [];
            localStorage.setItem('searchHistory', JSON.stringify(searchHistory));
        } else {
            console.error('Failed to load search history:', await historyResponse.json());
            searchHistory = [];
            localStorage.removeItem('searchHistory');
        }

        // Fetch user preferences
        const prefsResponse = await fetch(`${backendUrl}/user/preferences`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (prefsResponse.ok) {
            const data = await prefsResponse.json();
            userPreferences = data.preferences || {};
            localStorage.setItem('userPreferences', JSON.stringify(userPreferences));
        } else {
            console.error('Failed to load preferences:', await prefsResponse.json());
            userPreferences = {};
            localStorage.removeItem('userPreferences');
        }

    } catch (error) {
        console.error('Network error loading user data:', error);
        showNotification('Failed to load user data. Please try logging in again.', 'error');
        // If a critical network error, you might want to force logout: logout();
    }

    // After loading, update the UI components that depend on this data
    populateFavorites();
    populateSearchHistory();
    populatePreferencesForm();
    updatePropertyCardFavoriteButtons(); // Update property cards to reflect loaded favorites
}


// --- Functions to Populate UI Sections ---

function populateFavorites() {
    const favoritesGrid = document.getElementById('favoritePropertiesGrid');
    if (favoritesGrid) {
        displayProperties(favoriteProperties, 'favoritePropertiesGrid');
    }
}

function populateSearchHistory() {
    const searchHistoryList = document.getElementById('searchHistoryList');
    if (!searchHistoryList) return;

    searchHistoryList.innerHTML = '';
    if (searchHistory.length === 0) {
        searchHistoryList.innerHTML = '<p>No search history yet.</p>';
        return;
    }

    searchHistory.forEach(item => {
        const listItem = document.createElement('li');
        listItem.innerHTML = `
            <i class="fas fa-search"></i>
            <span>${item.query}</span>
            <small>${new Date(item.timestamp).toLocaleDateString()}</small>
        `;
        // Add click listener to re-run search (optional)
        // listItem.addEventListener('click', () => { /* populate form and search */ });
        searchHistoryList.appendChild(listItem);
    });
}

function populatePreferencesForm() {
    const preferencesForm = document.getElementById('userPreferencesForm');
    if (!preferencesForm) return;

    // Populate form fields with existing preferences
    // Example: document.getElementById('prefLocation').value = userPreferences.location || '';
    // Add logic for all preference fields
    document.getElementById('prefLocation').value = userPreferences.location || '';
    document.getElementById('prefMinPrice').value = userPreferences.minPrice || '';
    document.getElementById('prefMaxPrice').value = userPreferences.maxPrice || '';
    document.getElementById('prefPropertyType').value = userPreferences.propertyType || '';
    document.getElementById('prefBedrooms').value = userPreferences.bedrooms || '';
    document.getElementById('prefBathrooms').value = userPreferences.bathrooms || '';
}

// Function to handle saving preferences
async function savePreferences(event) {
    event.preventDefault();
    if (!currentUser) {
        showNotification('Please log in to save preferences.', 'warning');
        window.location.href = 'login.html';
        return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
        showNotification('Authentication token missing. Please log in again.', 'error');
        window.location.href = 'login.html';
        return;
    }

    const updatedPreferences = {
        location: document.getElementById('prefLocation').value,
        minPrice: document.getElementById('prefMinPrice').value,
        maxPrice: document.getElementById('prefMaxPrice').value,
        propertyType: document.getElementById('prefPropertyType').value,
        bedrooms: document.getElementById('prefBedrooms').value,
        bathrooms: document.getElementById('prefBathrooms').value
    };

    try {
        const response = await fetch(`${backendUrl}/user/preferences`, { // Assuming a backend endpoint
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(updatedPreferences)
        });

        const data = await response.json();
        if (response.ok) {
            userPreferences = updatedPreferences; // Update local state
            localStorage.setItem('userPreferences', JSON.stringify(userPreferences)); // Update local storage
            showNotification('Preferences saved successfully!', 'success');
        } else {
            showNotification(`Failed to save preferences: ${data.message || 'Server error.'}`, 'error');
        }
    } catch (error) {
        console.error('Error saving preferences:', error);
        showNotification('An error occurred while saving preferences.', 'error');
    }
}


// --- Initial Load & Event Listener setup ---
document.addEventListener('DOMContentLoaded', () => {
    // Call checkLoginStatus on every page load to update header UI
    checkLoginStatus();

    // Attach event listener for the main search form (if present)
    const searchForm = document.getElementById('searchForm');
    if (searchForm) {
        searchForm.addEventListener('submit', handleSearch);
    }

    // Attach event listeners for login and register forms (if present)
    // IMPORTANT: Ensure 'onsubmit' attributes are REMOVED from HTML forms for these
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', login); // 'login' comes from auth.js
    }

    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', register); // 'register' comes from auth.js
    }

    // Attach event listener for save preferences form (if present)
    const preferencesForm = document.getElementById('userPreferencesForm');
    if (preferencesForm) {
        preferencesForm.addEventListener('submit', savePreferences);
    }

    // Initial display of properties (e.g., on index.html or properties.html)
    // Only call if the element exists on the current page
    const propertiesGrid = document.getElementById('propertiesGrid');
    if (propertiesGrid) {
        displayProperties(sampleProperties, 'propertiesGrid');
    }

    const aiRecommendationsGrid = document.getElementById('aiRecommendations');
    if (aiRecommendationsGrid) {
        // You would typically fetch AI recommendations from backend
        // For now, use a subset or filtered version of sampleProperties
        displayProperties(sampleProperties.slice(0, 3), 'aiRecommendations');
    }

    const relatedPropertiesGrid = document.getElementById('relatedPropertiesGrid');
    if (relatedPropertiesGrid) {
        displayProperties(sampleProperties.slice(3), 'relatedPropertiesGrid');
    }

});

// Make sure `showNotification` is accessible globally from `auth.js`
// This line assumes `auth.js` is loaded before `script.js` or they are structured to avoid conflicts
// For now, it's defined in auth.js and we assume it's available.
// window.showNotification = showNotification; // If you want to explicitly expose it globally from script.js, but it's better to manage includes carefully.