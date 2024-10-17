import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root'); // This should get the div
if (!rootElement) {
  console.error('Root element not found');
} else {
  const root = ReactDOM.createRoot(rootElement); // Pass the root element
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
