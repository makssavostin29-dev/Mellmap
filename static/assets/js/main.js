document.addEventListener('DOMContentLoaded', () => {
  const map = L.map('map').setView([55.7558, 37.6176], 11);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(map);

  let places = [];

  fetch('/api/places')
    .then(res => res.json())
    .then(data => {
      places = data;
      renderMarkers(places);
    })
    .catch(err => {
      console.error('Ошибка загрузки:', err);
      alert('Не удалось загрузить заведения');
    });

  const markers = L.layerGroup().addTo(map);

  function renderMarkers(filteredPlaces) {
    markers.clearLayers();
    filteredPlaces.forEach(place => {
      if (isNaN(place.lat) || isNaN(place.lng)) return;
      const marker = L.marker([place.lat, place.lng]).addTo(markers);
      marker.on('click', () => showPlaceDetails(place));
    });
  }

  function initCarousel(photos) {
    const carousel = document.getElementById('photo-carousel');

    if (!photos || photos.length === 0) {
      // Используем локальный плейсхолдер в виде SVG в base64
      const noPhotoSvg = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjUwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIiAvPgogIDx0ZXh0IHg9IjQwMCIgeT0iMjUwIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxOCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzk5OSI+Tm8gUGhvdG88L3RleHQ+Cjwvc3ZnPgo=';
      carousel.innerHTML = `
        <img src="${noPhotoSvg}" alt="Нет фото" class="active">
        <div class="carousel-controls" style="display:none;"></div>
        <div class="carousel-indicators" style="display:none;"></div>
      `;
      return;
    }

    carousel.innerHTML = '';
    const images = photos.map(src => {
      const img = document.createElement('img');
      img.src = src;
      return img;
    });

    images[0].classList.add('active');
    images.forEach(img => carousel.appendChild(img));

    const controls = document.createElement('div');
    controls.className = 'carousel-controls';
    controls.innerHTML = `
      <button class="carousel-btn" id="prev-btn">‹</button>
      <button class="carousel-btn" id="next-btn">›</button>
    `;
    carousel.appendChild(controls);

    const indicators = document.createElement('div');
    indicators.className = 'carousel-indicators';
    indicators.innerHTML = photos.map((_, i) =>
      `<div class="carousel-indicator ${i === 0 ? 'active' : ''}" data-index="${i}"></div>`
    ).join('');
    carousel.appendChild(indicators);

    let currentIndex = 0;

    function updateCarousel() {
      images.forEach((img, i) => {
        img.classList.toggle('active', i === currentIndex);
      });
      indicators.querySelectorAll('.carousel-indicator').forEach((ind, i) => {
        ind.classList.toggle('active', i === currentIndex);
      });
    }

    document.getElementById('prev-btn').onclick = () => {
      currentIndex = (currentIndex - 1 + photos.length) % photos.length;
      updateCarousel();
    };

    document.getElementById('next-btn').onclick = () => {
      currentIndex = (currentIndex + 1) % photos.length;
      updateCarousel();
    };

    indicators.onclick = (e) => {
      if (e.target.classList.contains('carousel-indicator')) {
        currentIndex = parseInt(e.target.dataset.index);
        updateCarousel();
      }
    };

    carousel.addEventListener('click', (e) => {
      if (e.target.tagName === 'IMG') {
        document.getElementById('zoomed-photo').src = e.target.src;
        document.getElementById('zoom-modal').classList.add('active');
      }
    });
  }

  function showPlaceDetails(place) {
    document.getElementById('place-name').textContent = place.name;
    document.getElementById('place-rating').textContent = `⭐️ ${place.rating}`;
    document.getElementById('place-address').textContent = place.address;
    document.getElementById('place-price').textContent = place.price;
    document.getElementById('place-district').textContent = place.district;

    // Отображение времени завтрака с часами
    let breakfastTimeText = '';
    if (place.breakfast_time === 'weekends_only') {
      breakfastTimeText = 'Только по выходным';
    } else if (place.breakfast_time === 'all_day') {
      breakfastTimeText = 'Весь день';
    } else if (place.breakfast_time === 'specific_time') {
      if (place.breakfast_hours) {
        breakfastTimeText = `в определённое время (${place.breakfast_hours})`;
      } else {
        breakfastTimeText = 'в определённое время';
      }
    } else {
      breakfastTimeText = place.breakfast_time;
    }
    document.getElementById('place-breakfast-time').textContent = breakfastTimeText;

    initCarousel(place.photos || []);

    const reviewsEl = document.getElementById('reviews-list');
    reviewsEl.innerHTML = '<p>Пока нет отзывов.</p>';

    document.getElementById('place-details').classList.add('active');
  }

  document.getElementById('close-details').addEventListener('click', () => {
    document.getElementById('place-details').classList.remove('active');
  });

  document.getElementById('zoom-modal').addEventListener('click', (e) => {
    if (e.target.id === 'zoom-modal' || e.target.id === 'zoomed-photo') {
      document.getElementById('zoom-modal').classList.remove('active');
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (document.getElementById('place-details').classList.contains('active')) {
        document.getElementById('place-details').classList.remove('active');
      }
      if (document.getElementById('zoom-modal').classList.contains('active')) {
        document.getElementById('zoom-modal').classList.remove('active');
      }
    }
  });

  function applyFilters() {
    const district = document.getElementById('district-filter').value;
    const breakfastTime = document.getElementById('breakfast-time-filter').value;
    const filtered = places.filter(p =>
      (!district || p.district === district) &&
      (!breakfastTime || p.breakfast_time === breakfastTime)
    );
    renderMarkers(filtered);
  }

  document.getElementById('district-filter').addEventListener('change', applyFilters);
  document.getElementById('breakfast-time-filter').addEventListener('change', applyFilters);
});