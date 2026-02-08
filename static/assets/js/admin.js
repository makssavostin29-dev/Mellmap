let currentEditId = null;

function loadPlaces() {
  return fetch('/api/places').then(res => res.json());
}

function renderPlacesList() {
  loadPlaces().then(places => {
    const listEl = document.getElementById('places-list');
    if (places.length === 0) {
      listEl.innerHTML = '<p>Нет заведений.</p>';
      return;
    }

    listEl.innerHTML = [...places]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(place => `
        <div class="place-item" data-id="${place.id}">
          <h4>${place.name}</h4>
          <p><strong>Округ:</strong> ${place.district}</p>
          <p><strong>Категория:</strong> ${place.category}</p>
          <p><strong>Адрес:</strong> ${place.address}</p>
          <div style="margin-top: 0.5rem;">
            <button class="edit-btn" data-id="${place.id}">Редактировать</button>
            <button class="delete-btn" data-id="${place.id}">Удалить</button>
          </div>
        </div>
      `).join('');

    document.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = Number(btn.dataset.id);
        openEditForm(id);
      });
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = Number(btn.dataset.id);
        if (confirm('Удалить это заведение?')) {
          deletePlace(id);
        }
      });
    });
  });
}

function openEditForm(placeId) {
  currentEditId = placeId;
  document.getElementById('form-title').textContent = 'Редактирование заведения';
  document.getElementById('save-btn').textContent = 'Сохранить изменения';

  fetch(`/api/places/${placeId}`)
    .then(res => res.json())
    .then(place => {
      document.getElementById('edit-id').value = place.id;
      document.getElementById('name').value = place.name;
      document.getElementById('district').value = place.district;
      document.getElementById('category').value = place.category;
      document.getElementById('lat').value = place.lat;
      document.getElementById('lng').value = place.lng;
      document.getElementById('address').value = place.address;
      document.getElementById('website').value = place.website || '';
      document.getElementById('price').value = place.price.replace('₽', '');
      document.getElementById('rating').value = place.rating;
      document.getElementById('description').value = place.description || '';
      document.getElementById('breakfast-time').value = place.breakfast_time || 'all_day';
      document.getElementById('breakfast-hours').value = place.breakfast_hours || '';
      const hoursGroup = document.getElementById('breakfast-hours-group');
      if (place.breakfast_time === 'specific_time') {
        hoursGroup.style.display = 'block';
      } else {
        hoursGroup.style.display = 'none';
      }

      // Показываем текущие фото
      const photoContainer = document.createElement('div');
      photoContainer.style.marginTop = '1rem';
      photoContainer.innerHTML = '<p>Текущие фото:</p>';
      if (place.photos && place.photos.length > 0) {
        place.photos.forEach((src, i) => {
          const img = document.createElement('img');
          img.src = src;
          img.style.width = '80px';
          img.style.height = '80px';
          img.style.objectFit = 'cover';
          img.style.marginRight = '5px';
          img.style.border = '2px solid #eee';
          img.style.borderRadius = '4px';
          photoContainer.appendChild(img);
        });
      } else {
        photoContainer.innerHTML += '<p>Нет фото</p>';
      }
      document.querySelector('.form-section').appendChild(photoContainer);

      // Кнопка "Удалить фото"
      const deletePhotosBtn = document.createElement('button');
      deletePhotosBtn.textContent = 'Удалить все фото';
      deletePhotosBtn.className = 'delete-btn';
      deletePhotosBtn.onclick = () => {
        document.getElementById('photo-files').value = '';
        photoContainer.remove();
      };
      document.querySelector('.form-section').appendChild(deletePhotosBtn);

      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

function deletePlace(placeId) {
  fetch(`/api/places/${placeId}`, {
    method: 'DELETE'
  })
  .then(() => {
    alert('Заведение удалено!');
    renderPlacesList();
  })
  .catch(err => {
    console.error(err);
    alert('Ошибка при удалении');
  });
}

document.getElementById('add-place-form').addEventListener('submit', function(e) {
  e.preventDefault();

  const files = Array.from(document.getElementById('photo-files').files);
  let photosBase64 = [];

  if (files.length === 0) {
    savePlace([]);
  } else {
    let loaded = 0;
    files.forEach(file => {
      if (!file.type.startsWith('image/jpeg') && !file.type.startsWith('image/png')) {
        alert(`Фото "${file.name}" должно быть в формате JPG или PNG.`);
        return;
      }

      if (file.size > 1024 * 1024) {
        alert(`Фото "${file.name}" слишком большое. Максимум 1 МБ.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.src = reader.result;

        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          const jpgDataUrl = canvas.toDataURL('image/jpeg', 0.8);
          photosBase64.push(jpgDataUrl);
          loaded++;
          if (loaded === files.length) {
            savePlace(photosBase64);
          }
        };

        img.onerror = () => {
          alert(`Ошибка при загрузке фото "${file.name}"`);
        };
      };

      reader.onerror = () => {
        alert(`Ошибка при чтении фото "${file.name}"`);
      };

      reader.readAsDataURL(file);
    });
  }

  function savePlace(photos) {
    const formData = {
      name: document.getElementById('name').value.trim(),
      district: document.getElementById('district').value,
      category: document.getElementById('category').value,
      lat: parseFloat(document.getElementById('lat').value),
      lng: parseFloat(document.getElementById('lng').value),
      address: document.getElementById('address').value.trim(),
      website: document.getElementById('website').value.trim() || null,
      price: '₽' + document.getElementById('price').value,
      rating: parseFloat(document.getElementById('rating').value),
      description: document.getElementById('description').value.trim() || '',
      breakfast_time: document.getElementById('breakfast-time').value,
      breakfast_hours: document.getElementById('breakfast-hours').value.trim() || null,
      photos: photos
    };

    const editId = document.getElementById('edit-id').value;
    const url = editId ? `/api/places/${editId}` : '/api/places';
    const method = editId ? 'PUT' : 'POST';

    if (isNaN(formData.lat) || isNaN(formData.lng)) {
      alert('Неверные координаты');
      return;
    }

    fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    })
    .then(() => {
      alert('Заведение сохранено!');
      resetForm();
      renderPlacesList();
    })
    .catch(err => {
      console.error(err);
      alert('Ошибка при сохранении');
    });
  }
});

document.getElementById('cancel-btn').addEventListener('click', resetForm);

function resetForm() {
  document.getElementById('add-place-form').reset();
  document.getElementById('edit-id').value = '';
  document.getElementById('form-title').textContent = 'Добавить заведение';
  document.getElementById('save-btn').textContent = 'Добавить заведение';
  const existingPhotoContainer = document.querySelector('.form-section div:last-child');
  if (existingPhotoContainer && existingPhotoContainer.style?.marginTop === '1rem') {
    existingPhotoContainer.remove();
  }
}

document.addEventListener('DOMContentLoaded', renderPlacesList);