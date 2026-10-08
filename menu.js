const header = document.querySelector('.site-header');
const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#main-nav');
const storagePrefix = 'olasunkanmi-portfolio-';
const sessionValues = new Map();
const localHosts = ['localhost', '127.0.0.1', '::1', '[::1]'];
const localEditingEnabled = window.location.protocol === 'file:' || localHosts.includes(window.location.hostname);

const readStoredValue = (key) => {
  try {
    return localStorage.getItem(key) || sessionValues.get(key) || null;
  } catch {
    return sessionValues.get(key) || null;
  }
};

const writeStoredValue = (key, value) => {
  sessionValues.set(key, value);
  try {
    localStorage.setItem(key, value);
  } catch {
    return false;
  }
  return true;
};

const getSavedImage = (imageId) => readStoredValue(`${storagePrefix}image-${imageId}`);
const saveImage = (imageId, imageData) => writeStoredValue(`${storagePrefix}image-${imageId}`, imageData);

const attachTextEditor = (button, fields, storageKey, idleLabel) => {
  const savedContent = readStoredValue(`${storagePrefix}${storageKey}`);
  if (savedContent) {
    try {
      const values = JSON.parse(savedContent);
      fields.forEach((field) => {
        const value = values[field.dataset.projectField || field.dataset.workField];
        if (typeof value === 'string') field.textContent = value;
      });
    } catch {
      sessionValues.delete(`${storagePrefix}${storageKey}`);
    }
  }

  button.type = 'button';
  button.textContent = idleLabel;
  button.setAttribute('aria-pressed', 'false');

  button.addEventListener('click', () => {
    const isEditing = button.getAttribute('aria-pressed') === 'true';
    if (!isEditing) {
      fields.forEach((field) => field.setAttribute('contenteditable', 'true'));
      button.setAttribute('aria-pressed', 'true');
      button.textContent = 'Save';
      (fields.find((field) => field.dataset.projectField === 'name') || fields[0])?.focus();
      return;
    }

    const values = Object.fromEntries(fields.map((field) => [
      field.dataset.projectField || field.dataset.workField,
      field.textContent.trim(),
    ]));
    const saved = writeStoredValue(`${storagePrefix}${storageKey}`, JSON.stringify(values));
    fields.forEach((field) => {
      field.removeAttribute('contenteditable');
      field.textContent = values[field.dataset.projectField || field.dataset.workField];
    });
    button.setAttribute('aria-pressed', 'false');
    button.textContent = saved ? idleLabel : 'Saved for this session';
  });
};

if (localEditingEnabled) {
  const sectionAside = document.querySelector('.section-heading-aside');
  const workEditor = document.createElement('button');
  workEditor.className = 'text-edit-button section-edit-button';
  workEditor.textContent = 'Edit section';
  if (sectionAside) {
    sectionAside.append(workEditor);
    attachTextEditor(workEditor, [...document.querySelectorAll('[data-work-field]')], 'work-section', 'Edit section');
  }

  document.querySelectorAll('[data-project-editor]').forEach((project) => {
    const fields = [...project.querySelectorAll('[data-project-field]')];
    const button = document.createElement('button');
    button.className = 'text-edit-button project-edit-button';
    button.setAttribute('aria-label', 'Edit project name, category, and description');
    project.append(button);
    attachTextEditor(button, fields, `project-details-${project.dataset.projectEditor}`, 'Edit details');
  });
}

if (header && menuButton && navigation) {
  const setMenuOpen = (isOpen) => {
    header.classList.toggle('menu-open', isOpen);
    menuButton.setAttribute('aria-expanded', String(isOpen));
    menuButton.setAttribute('aria-label', isOpen ? 'Close navigation' : 'Open navigation');
  };

  menuButton.addEventListener('click', () => {
    setMenuOpen(menuButton.getAttribute('aria-expanded') !== 'true');
  });

  navigation.addEventListener('click', (event) => {
    if (event.target.closest('a')) setMenuOpen(false);
  });

  document.addEventListener('click', (event) => {
    if (!header.contains(event.target)) setMenuOpen(false);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setMenuOpen(false);
  });

  window.matchMedia('(min-width: 641px)').addEventListener('change', () => setMenuOpen(false));
}

const showImage = (slot, imageSource, altText) => {
  slot.querySelector('.image-placeholder')?.remove();
  let image = slot.querySelector('img');
  if (!image) {
    image = document.createElement('img');
    image.alt = altText;
    slot.prepend(image);
  }
  image.alt = altText || image.alt;
  image.src = imageSource;
};

const showImagePlaceholder = (image) => {
  if (!image.isConnected) return;
  const placeholder = document.createElement('div');
  const projectTitle = image.closest('.project')?.querySelector('.project-info h3')?.textContent;
  placeholder.className = 'image-placeholder';
  placeholder.setAttribute('role', 'img');
  placeholder.setAttribute('aria-label', image.alt);
  placeholder.textContent = projectTitle || 'Featured project';
  image.replaceWith(placeholder);
};

const resizeImage = (file, maxDimension) => new Promise((resolve, reject) => {
  const source = new Image();
  const objectUrl = URL.createObjectURL(file);

  source.onload = () => {
    const scale = Math.min(1, maxDimension / Math.max(source.naturalWidth, source.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(source.naturalWidth * scale);
    canvas.height = Math.round(source.naturalHeight * scale);
    canvas.getContext('2d').drawImage(source, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(objectUrl);
    resolve(canvas.toDataURL('image/jpeg', 0.82));
  };

  source.onerror = () => {
    URL.revokeObjectURL(objectUrl);
    reject(new Error('This image could not be opened.'));
  };

  source.src = objectUrl;
});

const addImageControl = (slot, imageId, labelText) => {
  const label = document.createElement('label');
  const text = document.createElement('span');
  const picker = document.createElement('input');
  const savedImage = getSavedImage(imageId);

  label.className = 'image-upload-control';
  text.textContent = savedImage ? `Change ${labelText}` : `Add ${labelText}`;
  picker.type = 'file';
  picker.accept = 'image/*';
  picker.setAttribute('aria-label', `${text.textContent} for portfolio`);
  label.append(text, picker);
  slot.append(label);

  if (savedImage) {
    showImage(slot, savedImage, slot.dataset.alt || `Olasunkanmi Daniel ${labelText}`);
  }

  picker.addEventListener('change', async () => {
    const [file] = picker.files;
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      window.alert('Choose an image file to continue.');
      picker.value = '';
      return;
    }

    try {
      const imageData = await resizeImage(file, imageId === 'portrait' ? 1000 : 1600);
      const persisted = saveImage(imageId, imageData);
      showImage(slot, imageData, slot.dataset.alt || `Olasunkanmi Daniel ${labelText}`);
      text.textContent = persisted ? `Change ${labelText}` : `Change ${labelText} · temporary`;
      picker.setAttribute('aria-label', `Change ${labelText} for portfolio`);
    } catch (error) {
      window.alert(error.name === 'QuotaExceededError'
        ? 'Browser storage is full. Try a smaller image.'
        : 'This image could not be loaded. Please try another file.');
    }

    picker.value = '';
  });
};

document.querySelectorAll('[data-image-id]').forEach((slot) => {
  const imageId = slot.dataset.imageId;
  const image = slot.querySelector('img');
  const labelText = imageId === 'portrait'
    ? 'portrait'
    : imageId === 'featured'
      ? 'featured image'
      : `image ${imageId.replace('project-', '')}`;

  if (image) {
    slot.dataset.alt = image.alt;
    image.addEventListener('error', () => showImagePlaceholder(image), { once: true });
    if (image.complete && image.naturalWidth === 0) showImagePlaceholder(image);
  }

  if (localEditingEnabled) addImageControl(slot, imageId, labelText);
});