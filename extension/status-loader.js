let retryCount = 0;
const maxRetries = 3;

function showError() {
  document.getElementById('loading').style.display = 'none';
  document.getElementById('error').style.display = 'flex';
}

function showApp() {
  document.getElementById('loading').style.display = 'none';
  document.getElementById('error').style.display = 'none';
  document.getElementById('root').classList.add('loaded');
}

function retryLoading() {
  retryCount++;
  if (retryCount <= maxRetries) {
    location.reload();
  } else {
    document.querySelector('.error-message').textContent =
      'Plusieurs tentatives de chargement ont échoué. Veuillez recharger l\'extension.';
  }
}

function loadApp() {
  // Load React app
  const script = document.createElement('script');
  script.type = 'module';
  script.src = './status.js';

  script.onload = () => {
    console.log('Professional Status app loaded successfully');
    showApp();
  };

  script.onerror = (error) => {
    console.error('Failed to load Professional Status app:', error);
    showError();
  };

  // Fallback timeout
  setTimeout(() => {
    if (document.getElementById('loading').style.display !== 'none') {
      console.warn('App loading timeout, showing error');
      showError();
    }
  }, 10000); // 10 seconds timeout

  document.head.appendChild(script);
}

// Initialize app when DOM is ready
function initializeApp() {
  // Attach retry button event
  const retryButton = document.getElementById('retryButton');
  if (retryButton) {
    retryButton.addEventListener('click', retryLoading);
  }
  loadApp();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}

// Handle errors globally
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  if (retryCount === 0) {
    showError();
  }
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  if (retryCount === 0) {
    showError();
  }
});