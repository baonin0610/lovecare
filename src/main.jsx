import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import './index.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('App Error Boundary caught error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  handleHardReset = () => {
    try {
      localStorage.removeItem('lovecare_couple');
      sessionStorage.clear();
      if ('caches' in window) {
        caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))));
      }
    } catch (e) {}
    this.setState({ hasError: false, error: null });
    window.location.href = '/?reset=' + Date.now();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          fontFamily: 'system-ui, sans-serif',
          background: '#FAFAFA',
          color: '#1f2937',
          textAlign: 'center'
        }}>
          <div style={{
            maxWidth: '380px',
            background: 'white',
            padding: '32px 24px',
            borderRadius: '24px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.08)',
            border: '1px solid #f3f4f6'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '16px',
              background: '#FEE2E2',
              color: '#F43F5E',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto',
              fontSize: '22px'
            }}>
              ♥
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px', color: '#111827' }}>
              Đồng bộ dữ liệu phiên bản mới
            </h2>
            <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '20px', lineHeight: '1.5' }}>
              Giao diện vừa được làm mới. Bấm nút bên dưới để tiếp tục trải nghiệm!
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                onClick={this.handleReset}
                style={{
                  width: '100%',
                  padding: '14px 20px',
                  background: '#F43F5E',
                  color: 'white',
                  border: 'none',
                  borderRadius: '16px',
                  fontWeight: 'bold',
                  fontSize: '14px',
                  cursor: 'pointer',
                  boxShadow: '0 8px 16px -2px rgba(244, 63, 94, 0.25)'
                }}
              >
                Làm Mới &amp; Tiếp Tục Dùng
              </button>
              <button
                onClick={this.handleHardReset}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  background: 'transparent',
                  color: '#9ca3af',
                  border: 'none',
                  fontSize: '12px',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                Khởi động lại ứng dụng
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
