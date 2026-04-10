// CRITICAL: Must be first to patch Buffer before any other imports
import './init-buffer';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import './styles.css';
import { Issue } from './routes/Issue';
import { Login } from './routes/Login';

function Nav() {
  const { pathname } = useLocation();
  return (
    <nav>
      <Link to="/login" className={pathname === '/login' ? 'active' : ''}>
        Login
      </Link>
      <Link to="/issue" className={pathname === '/issue' ? 'active' : ''}>
        Issue
      </Link>
    </nav>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Nav />
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/issue" element={<Issue />} />
        <Route
          path="*"
          element={
            <div>
              <h1>404</h1>
              <p>
                Page not found. <Link to="/login">Go to login</Link>
              </p>
            </div>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
