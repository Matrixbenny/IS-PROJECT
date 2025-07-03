/\*\* script.js - Full client logic for HomeHunter Kenya \*\*/

const backendUrl = '[http://localhost:5000/api](http://localhost:5000/api)';
let allProperties = \[];

// --- Load properties on DOM ready ---
document.addEventListener('DOMContentLoaded', async function () {
const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user'));

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
});

// --- Display Properties ---
function displayProperties(properties) {
const grid = document.getElementById('propertiesGrid');
if (!grid) return;

grid.innerHTML = '';
properties.forEach(p => {
const card = document.createElement('div');
card.className = 'property-card';
card.innerHTML = `       <img src="${p.imageUrls?.[0] || 'placeholder.jpg'}" alt="Property Image" class="property-image">       <div class="property-info">         <h3 class="property-title">${p.title}</h3>         <p class="property-location">${p.location}</p>         <p class="property-price">Ksh ${p.price.toLocaleString()}</p>         <div class="property-features">           <span>${p.bedrooms} Beds</span>           <span>${p.bathrooms} Baths</span>           <span>${p.type}</span>         </div>         <div class="property-actions">           <button class="btn btn-primary" onclick="viewDetails('${p._id}')">View Details</button>           <button class="btn btn-secondary" onclick="likeProperty('${p._id}')">❤</button>         </div>       </div>
    `;
grid.appendChild(card);
});
}

// --- View Property Details ---
function viewDetails(propertyId) {
window\.location.href = `property-details.html?id=${propertyId}`;
}

// --- Like/Favorite a Property ---
async function likeProperty(propertyId) {
const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user'));

if (!token || !user) return alert('Login required to like properties');

try {
const res = await fetch(`${backendUrl}/users/${user.id}/favorites`, {
method: 'POST',
headers: {
'Content-Type': 'application/json',
'Authorization': `Bearer ${token}`
},
body: JSON.stringify({ propertyId })
});
if (res.ok) {
alert('Property added to favorites!');
} else {
const data = await res.json();
alert(data.message || 'Failed to like property');
}
} catch (err) {
console.error('Error liking property:', err);
}
}

// --- Generate AI Recommendations ---
async function generateRecommendations() {
const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user'));

if (!token || !user) return alert('Login required');

try {
const res = await fetch(`${backendUrl}/recommendations`, {
method: 'POST',
headers: {
'Content-Type': 'application/json',
'Authorization': `Bearer ${token}`
},
body: JSON.stringify({ userId: user.id })
});
const data = await res.json();
displayProperties(data.recommendations);
} catch (err) {
console.error('Error getting recommendations:', err);
}
}
