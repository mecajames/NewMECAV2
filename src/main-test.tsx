import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';

// Simple test component to see if React is working
function TestApp() {
  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>Test App Loading...</h1>
      <p>If you can see this, React is working!</p>
      <p>Checking Supabase connection...</p>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TestApp />
  </StrictMode>
);