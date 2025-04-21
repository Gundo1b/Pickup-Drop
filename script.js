const map = L.map('map').setView([-26.2041, 28.0473], 12); // Johannesburg

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors',
}).addTo(map);

const apiKey = '5b3ce3597851110001cf62483d6287df4af94372b6dab9cee7e6ffe8';
let pickupMarker = null;
let dropMarker = null;
let routeLayer = null;

const pickupInput = document.getElementById('pickup');
const dropInput = document.getElementById('drop');

let pickupCoords = null;
let dropCoords = null;

// Click map to set pickup and drop points
map.on('click', function (e) {
  if (!pickupMarker) {
    pickupCoords = [e.latlng.lat, e.latlng.lng];
    pickupMarker = createMarker(e.latlng, 'Pickup', true);
    pickupInput.value = `${e.latlng.lat}, ${e.latlng.lng}`;
  } else if (!dropMarker) {
    dropCoords = [e.latlng.lat, e.latlng.lng];
    dropMarker = createMarker(e.latlng, 'Drop', false);
    dropInput.value = `${e.latlng.lat}, ${e.latlng.lng}`;
    getRoute();
  }
});

function createMarker(latlng, label, isPickup) {
  const marker = L.marker(latlng, { draggable: true })
    .addTo(map)
    .bindPopup(label)
    .openPopup();

  marker.on('dragend', function () {
    const pos = marker.getLatLng();
    if (isPickup) {
      pickupCoords = [pos.lat, pos.lng];
      pickupInput.value = `${pos.lat}, ${pos.lng}`;
    } else {
      dropCoords = [pos.lat, pos.lng];
      dropInput.value = `${pos.lat}, ${pos.lng}`;
    }
    getRouteIfReady();
  });

  return marker;
}

function getRouteIfReady() {
  if (pickupCoords && dropCoords) {
    getRoute();
  }
}

async function getRoute() {
  const coords = [
    [parseFloat(pickupCoords[1]), parseFloat(pickupCoords[0])],
    [parseFloat(dropCoords[1]), parseFloat(dropCoords[0])]
  ];

  const url = 'https://api.openrouteservice.org/v2/directions/driving-car/geojson';

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ coordinates: coords }),
    });

    const data = await res.json();

    if (routeLayer) map.removeLayer(routeLayer);

    routeLayer = L.geoJSON(data, {
      style: { color: 'blue', weight: 5 },
    }).addTo(map);

    map.fitBounds(routeLayer.getBounds());

    const distance = data.features[0].properties.summary.distance / 1000; // in km
    const duration = data.features[0].properties.summary.duration / 60; // in minutes

    const baseRate = 100; // $2 per km
    const price = (distance * baseRate).toFixed(2);

    document.getElementById('distance').innerText = `${distance.toFixed(2)} km`;
    document.getElementById('duration').innerText = `${duration.toFixed(1)} mins`;
    document.getElementById('price').innerText = `R${price}`;

  } catch (error) {
    alert('Failed to calculate route');
    console.error(error);
  }
}

function fetchSuggestions(query, callback) {
  fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}`)
    .then(res => res.json())
    .then(data => callback(data));
}

function createAutocomplete(input, isPickup) {
  input.addEventListener('input', () => {
    const value = input.value.trim();
    if (value.length < 3) return;

    fetchSuggestions(value, results => {
      let oldList = input.parentNode.querySelector('.autocomplete-list');
      if (oldList) oldList.remove();

      const list = document.createElement('ul');
      list.className = 'autocomplete-list';
      list.style = 'position:absolute;background:#fff;z-index:1000;width:100%;max-height:200px;overflow:auto;border:1px solid #ccc;padding:0;margin:0;list-style:none;';

      results.forEach(place => {
        const item = document.createElement('li');
        item.textContent = place.display_name;
        item.style = 'padding:10px;cursor:pointer;';
        item.addEventListener('click', () => {
          input.value = place.display_name;
          const latlng = L.latLng(place.lat, place.lon);

          if (isPickup) {
            pickupCoords = [place.lat, place.lon];
            if (pickupMarker) map.removeLayer(pickupMarker);
            pickupMarker = createMarker(latlng, 'Pickup', true);
          } else {
            dropCoords = [place.lat, place.lon];
            if (dropMarker) map.removeLayer(dropMarker);
            dropMarker = createMarker(latlng, 'Drop', false);
          }

          getRouteIfReady();
          list.remove();
        });
        list.appendChild(item);
      });

      input.parentNode.appendChild(list);
    });
  });
}

createAutocomplete(pickupInput, true);
createAutocomplete(dropInput, false);
