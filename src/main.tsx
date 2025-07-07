
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Add error handling for the root render
const container = document.getElementById("root");

if (!container) {
  throw new Error("Root container not found");
}

// Add global error handlers
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  // Prevent the error from causing a white screen
  event.preventDefault();
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  // Prevent the rejection from causing issues
  event.preventDefault();
});

// Ensure DOM is ready before rendering
const initializeApp = () => {
  try {
    const root = createRoot(container);
    root.render(<App />);
    console.log('App initialized successfully');
  } catch (error) {
    console.error('Failed to initialize app:', error);
    // Fallback error display
    container.innerHTML = `
      <div style="
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: system-ui, -apple-system, sans-serif;
        color: #dc2626;
        text-align: center;
        padding: 2rem;
      ">
        <div>
          <h1 style="font-size: 2rem; margin-bottom: 1rem;">Loading Error</h1>
          <p style="margin-bottom: 1rem;">Unable to load the application. Please refresh the page.</p>
          <button onclick="window.location.reload()" style="
            background: #2563eb;
            color: white;
            padding: 0.5rem 1rem;
            border: none;
            border-radius: 0.375rem;
            cursor: pointer;
          ">Refresh Page</button>
        </div>
      </div>
    `;
  }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}
