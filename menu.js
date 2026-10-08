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

  const publishTools = document.createElement('div');
  const publishButton = document.createElement('button');
  const publishStatus = document.createElement('p');
  publishTools.className = 'publish-tools';
  publishButton.className = 'publish-button';
  publishButton.type = 'button';
  publishButton.textContent = 'Save changes to website';
  publishStatus.className = 'publish-status';
  publishStatus.setAttribute('role', 'status');
  publishTools.append(publishButton, publishStatus);
  document.body.append(publishTools);

  publishButton.addEventListener('click', async () => {
    publishButton.disabled = true;
    publishStatus.textContent = '';
    try {
      await publishLocalChanges(publishStatus);
    } catch (error) {
      if (error.name !== 'AbortError') {
        publishStatus.textContent = error.message || 'Could not save the website files.';
      }
    } finally {
      publishButton.disabled = false;
    }
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

const cvDialog = document.querySelector('#cv-dialog');
const cvViewer = document.querySelector('[data-cv-viewer]');

if (cvDialog && cvViewer) {
  const closeButton = document.querySelector('[data-cv-close]');

  cvViewer.addEventListener('load', () => {
    if (cvDialog.open) closeButton?.focus({ preventScroll: true });
  });

  document.querySelectorAll('[data-cv-open]').forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      if (cvViewer.getAttribute('src') === 'about:blank') {
        cvViewer.src = cvViewer.dataset.cvSrc;
      }
      cvDialog.showModal();
      closeButton?.focus({ preventScroll: true });
    });
  });

  closeButton?.addEventListener('click', () => cvDialog.close());
  cvDialog.addEventListener('click', (event) => {
    if (event.target === cvDialog) cvDialog.close();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && cvDialog.open) {
      event.preventDefault();
      cvDialog.close();
    }
  });
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

const openCvDatabase = () => new Promise((resolve, reject) => {
  if (!window.indexedDB) {
    reject(new Error('Persistent browser storage is unavailable.'));
    return;
  }

  const request = window.indexedDB.open('olasunkanmi-portfolio-files', 1);
  request.onupgradeneeded = () => {
    if (!request.result.objectStoreNames.contains('documents')) {
      request.result.createObjectStore('documents');
    }
  };
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error || new Error('Could not open browser storage.'));
});

const getSavedCv = async () => {
  const database = await openCvDatabase();
  return new Promise((resolve, reject) => {
    const request = database.transaction('documents', 'readonly').objectStore('documents').get('cv');
    request.onsuccess = () => {
      database.close();
      resolve(request.result || null);
    };
    request.onerror = () => {
      database.close();
      reject(request.error || new Error('Could not read the saved CV.'));
    };
  });
};

const storeCv = async (file) => {
  const database = await openCvDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction('documents', 'readwrite');
    transaction.objectStore('documents').put({ file, filename: file.name }, 'cv');
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error || new Error('Could not save the CV.'));
    };
    transaction.onabort = () => {
      database.close();
      reject(transaction.error || new Error('CV storage was interrupted.'));
    };
  });
};

const writeFile = async (directory, filename, contents) => {
  const fileHandle = await directory.getFileHandle(filename, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(contents);
  await writable.close();
};

const publishLocalChanges = async (status) => {
  if (!window.showDirectoryPicker) {
    throw new Error('Open this page in Chrome or Edge at localhost:5500 to save changes into your site folder.');
  }

  status.textContent = 'Choose your portfolio project folder…';
  const root = await window.showDirectoryPicker({ mode: 'readwrite' });
  const exportedDocument = document.documentElement.cloneNode(true);

  exportedDocument.querySelectorAll('.image-upload-control, .project-edit-button, .section-edit-button, .publish-tools, .cv-status')
    .forEach((control) => control.remove());
  exportedDocument.querySelectorAll('[contenteditable]').forEach((field) => field.removeAttribute('contenteditable'));
  exportedDocument.querySelectorAll('.cv-upload-control').forEach((control) => control.remove());

  const assets = await root.getDirectoryHandle('assets', { create: true });
  const uploadedImages = await assets.getDirectoryHandle('portfolio-images', { create: true });
  let imageCount = 0;

  for (const imageSlot of document.querySelectorAll('[data-image-id]')) {
    const imageData = getSavedImage(imageSlot.dataset.imageId);
    if (!imageData) continue;
    const exportedSlot = exportedDocument.querySelector(`[data-image-id="${imageSlot.dataset.imageId}"]`);
    if (!exportedSlot) continue;

    const imageBlob = await (await fetch(imageData)).blob();
    const imageName = `${imageSlot.dataset.imageId}.jpg`;
    await writeFile(uploadedImages, imageName, imageBlob);

    let exportedImage = exportedSlot.querySelector('img');
    if (!exportedImage) {
      exportedImage = document.createElement('img');
      exportedSlot.prepend(exportedImage);
    }
    exportedImage.src = `./assets/portfolio-images/${imageName}`;
    exportedImage.alt = exportedSlot.dataset.alt || 'Portfolio image';
    exportedSlot.querySelector('.image-placeholder')?.remove();
    imageCount += 1;
  }

  const savedCv = await getSavedCv().catch(() => null);
  if (savedCv?.file instanceof Blob) {
    await writeFile(assets, 'olasunkanmi-daniel-cv.pdf', savedCv.file);
    const exportedViewer = exportedDocument.querySelector('[data-cv-viewer]');
    exportedViewer.src = './assets/olasunkanmi-daniel-cv.pdf';
    exportedViewer.dataset.cvSrc = './assets/olasunkanmi-daniel-cv.pdf';
  }

  const exportedHtml = `<!doctype html>\n${exportedDocument.outerHTML}`;
  await writeFile(root, 'index.html', new Blob([exportedHtml], { type: 'text/html;charset=utf-8' }));
  const cvMessage = savedCv?.file instanceof Blob ? ' CV included.' : '';
  status.textContent = `Saved index.html and ${imageCount} uploaded image${imageCount === 1 ? '' : 's'}.${cvMessage} Stage and push these files to publish.`;
};

const setupCvUpload = () => {
  const picker = document.querySelector('.cv-upload-control input[type="file"]');
  const uploadLabel = document.querySelector('.cv-upload-control');
  const uploadText = uploadLabel?.querySelector('span');
  const status = document.querySelector('[data-cv-status]');
  const viewer = document.querySelector('[data-cv-viewer]');
  let activeUrl = null;

  if (!picker || !uploadLabel || !uploadText || !viewer) return;
  uploadLabel.hidden = false;

  const useCv = (file, filename) => {
    if (activeUrl) URL.revokeObjectURL(activeUrl);
    activeUrl = URL.createObjectURL(file);
    viewer.src = activeUrl;
    viewer.title = `Curriculum vitae: ${filename}`;
    uploadText.textContent = 'Change CV PDF';
    if (status) status.textContent = `Ready: ${filename}`;
  };

  getSavedCv().then((savedCv) => {
    if (savedCv?.file instanceof Blob) useCv(savedCv.file, savedCv.filename || 'olasunkanmi-daniel-cv.pdf');
  }).catch(() => {
    if (status) status.textContent = 'Choose your CV PDF to use it in this browser session.';
  });

  picker.addEventListener('change', async () => {
    const [file] = picker.files;
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      window.alert('Choose a PDF file to continue.');
      picker.value = '';
      return;
    }

    if (status) status.textContent = 'Saving your CV…';
    useCv(file, file.name);
    try {
      await storeCv(file);
      if (status) status.textContent = `Ready: ${file.name}`;
    } catch {
      if (status) status.textContent = `Ready for this session only: ${file.name}`;
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

if (localEditingEnabled) setupCvUpload();