/** script.js - Full client logic for HomeHunter Kenya **/

const backendUrl = 'http://localhost:5000/api'; // CORRECTED: Removed markdown link syntax
let allProperties = [];

// --- Load properties on DOM ready ---
document.addEventListener('DOMContentLoaded', async function () {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));

    // Navigation logic (optional, can be customized)
    if (document.getElementById('loggedInNav') && document.getElementById('loggedOutNav')) {
        if (token && user) {
            document.getElementById('loggedInNav').style.display = 'flex';
            document.getElementById('loggedOutNav').style.display = 'none';
            document.getElementById('userNameDisplay').textContent = user.name;
        } else {
            document.getElementById('loggedInNav').style.display = 'none';
            document.getElementById('loggedOutNav').style.display = 'flex';
        }
    }

    try {
        const response = await fetch(`${backendUrl}/properties`);
        if (response.ok) {
            allProperties = await response.json();
            displayProperties(allProperties);
        } else {
            console.error('Failed to load properties');
        }
    } catch (error) {
        console.error('Error fetching properties:', error);
    }

    // Initial load for property details if on property-details.html
    if (document.body.id === 'property-details-page') {
        const urlParams = new URLSearchParams(window.location.search);
        const propertyId = urlParams.get('id');
        if (propertyId) {
            fetchPropertyDetails(propertyId);
        }
    }

    // --- Property Search Filter Logic ---
    const searchForm = document.getElementById('searchForm');
    if (searchForm) {
        searchForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const location = document.getElementById('location').value.trim().toLowerCase();
            const propertyType = document.getElementById('propertyType').value;
            const minPrice = parseInt(document.getElementById('minPrice').value) || 0;
            const maxPrice = parseInt(document.getElementById('maxPrice').value) || Number.MAX_SAFE_INTEGER;

            // Add more filters if needed (e.g., bedrooms, bathrooms)

            const filtered = allProperties.filter(p => {
                let match = true;
                if (location && !p.location.toLowerCase().includes(location)) match = false;
                if (propertyType && p.type !== propertyType) match = false;
                if (p.price < minPrice || p.price > maxPrice) match = false;
                // Add more filter checks here
                return match;
            });
            displayProperties(filtered);
            // Optionally show a count or message
            const countMsg = document.getElementById('searchCountMsg');
            if (countMsg) {
                countMsg.textContent = `${filtered.length} properties found.`;
            }
        });
    }
});


// Function to toggle mobile menu (if you have one)
document.addEventListener('DOMContentLoaded', () => {
    const menuToggle = document.querySelector('.menu-toggle');
    const navLinks = document.querySelector('.nav-links');
    if (menuToggle && navLinks) {
        menuToggle.addEventListener('click', () => {
            navLinks.classList.toggle('active');
        });
    }
});


// --- Display Properties ---
function displayProperties(properties) {
    const grid = document.getElementById('propertiesGrid');
    if (!grid) return;

    grid.innerHTML = '';
    properties.forEach(p => {
        const card = document.createElement('div');
        card.className = 'property-card';
        card.innerHTML = `
            <img src="${p.imageUrls?.[0] || 'placeholder.jpg'}" alt="Property Image" class="property-image">
            <div class="property-info">
                <h3 class="property-title">${p.title}</h3>
                <p class="property-location">${p.location}</p>
                <p class="property-price">Ksh ${p.price.toLocaleString()}</p>
                <div class="property-features">
                    <span>${p.bedrooms} Beds</span>
                    <span>${p.bathrooms} Baths</span>
                    <span>${p.type}</span>
                </div>
                <div class="property-actions">
                    <button onclick="viewDetails('${p._id}')">View Details</button>
                    <button onclick="likeProperty('${p._id}')">❤</button>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}

// --- View Property Details ---
async function fetchPropertyDetails(propertyId) {
    try {
        const response = await fetch(`${backendUrl}/properties/${propertyId}`);
        if (response.ok) {
            const property = await response.json();
            // Render property details on the page
            document.getElementById('detailTitle').textContent = property.title;
            document.getElementById('detailPrice').textContent = `Ksh ${property.price.toLocaleString()}`;
            document.getElementById('detailLocation').textContent = property.location;
            document.getElementById('detailBeds').textContent = `${property.bedrooms} Beds`;
            document.getElementById('detailBaths').textContent = `${property.bathrooms} Baths`;
            document.getElementById('detailType').textContent = property.type;
            document.getElementById('detailDescription').textContent = property.description;
            document.getElementById('detailOwnerPhone').textContent = property.ownerPhone;

            const featuresList = document.getElementById('detailFeatures');
            featuresList.innerHTML = '';
            property.features.forEach(feature => {
                const li = document.createElement('li');
                li.textContent = feature;
                featuresList.appendChild(li);
            });

            const gallery = document.getElementById('propertyGallery');
            gallery.innerHTML = '';
            property.imageUrls.forEach(url => {
                const img = document.createElement('img');
                img.src = url;
                img.alt = 'Property Image';
                gallery.appendChild(img);
            });

        } else {
            console.error('Failed to load property details');
            document.getElementById('property-details-container').innerHTML = '<p>Property not found or an error occurred.</p>';
        }
    } catch (error) {
        console.error('Error fetching property details:', error);
        document.getElementById('property-details-container').innerHTML = '<p>An error occurred while loading property details.</p>';
    }
}


function viewDetails(propertyId) {
    window.location.href = `property-details.html?id=${propertyId}`;
}

// --- Generate AI Recommendations ---
async function generateRecommendations() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));

    if (!token || !user) return showNotification('Login required to get recommendations', 'error');

    try {
        const res = await fetch(`${backendUrl.replace('/api', '')}/recommendations`, { // Adjusted URL for recommendations endpoint
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ userId: user.id })
        });
        const data = await res.json();
        if (res.ok) {
            showNotification('Recommendations generated!', 'success');
            // Here you would typically display these recommendations
            console.log('AI Recommendations:', data.recommendations);
            // Example: displayRecommendations(data.recommendations);
        } else {
            showNotification(data.message || 'Failed to get recommendations', 'error');
        }
    } catch (err) {
        console.error('Error generating recommendations:', err);
        showNotification('An error occurred while getting recommendations', 'error');
    }
}

// --- Notification Utility ---
function showNotification(message, type = 'info') {
    let notif = document.getElementById('globalNotification');
    if (!notif) {
        notif = document.createElement('div');
        notif.id = 'globalNotification';
        notif.style.position = 'fixed';
        notif.style.top = '30px';
        notif.style.left = '50%';
        notif.style.transform = 'translateX(-50%)';
        notif.style.zIndex = '9999';
        notif.style.padding = '16px 32px';
        notif.style.borderRadius = '8px';
        notif.style.fontSize = '1.1rem';
        notif.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
        notif.style.color = '#fff';
        notif.style.display = 'none';
        document.body.appendChild(notif);
    }
    notif.textContent = message;
    notif.style.backgroundColor = type === 'success' ? '#38a169' : (type === 'error' ? '#e53e3e' : '#3182ce');
    notif.style.display = 'block';
    setTimeout(() => {
        notif.style.display = 'none';
    }, 3500);
}