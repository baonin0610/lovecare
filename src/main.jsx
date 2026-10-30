import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import './index.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('App Error Boundary caught error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = async () => {
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const reg of regs) {
          try {
            reg.active?.postMessage({ type: 'CLEAR_CACHE' });
            await reg.update();
          } catch (e) {}
        }
      }
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } catch (e) {}
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = window.location.pathname + '?reload=' + Date.now();
  };

  handleHardReset = async () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const reg of regs) {
          try {
            await reg.unregister();
          } catch (e) {}
        }
      }
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } catch (e) {}
    this.setState({ hasError: false, error: null, errorInfo: null });
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
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          background: '#0F172A',
          color: '#F8FAFC',
          textAlign: 'center'
        }}>
          <div style={{
            maxWidth: '380px',
            width: '100%',
            background: 'rgba(30, 41, 59, 0.95)',
            backdropFilter: 'blur(20px)',
            padding: '32px 24px',
            borderRadius: '28px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <div style={{
              width: '52px',
              height: '52px',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, #F43F5E, #FB7185)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 18px auto',
              fontSize: '24px',
              boxShadow: '0 10px 20px -5px rgba(244, 63, 94, 0.4)'
            }}>
              ♥
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px', color: '#FFFFFF' }}>
              Đồng bộ dữ liệu phiên bản mới
            </h2>
            <p style={{ fontSize: '13px', color: '#94A3B8', marginBottom: '22px', lineHeight: '1.5' }}>
              Giao diện vừa được cập nhật tính năng mới. Bấm nút bên dưới để đồng bộ và tiếp tục trải nghiệm!
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                onClick={this.handleReset}
                style={{
                  width: '100%',
                  padding: '14px 20px',
                  background: 'linear-gradient(135deg, #F43F5E, #E11D48)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '16px',
                  fontWeight: 'bold',
                  fontSize: '14px',
                  cursor: 'pointer',
                  boxShadow: '0 8px 20px -3px rgba(244, 63, 94, 0.35)',
                  transition: 'transform 0.15s ease'
                }}
              >
                Làm Mới &amp; Tiếp Tục Dùng
              </button>
              <button
                onClick={this.handleHardReset}
                style={{
                  width: '100%',
                  padding: '12px 20px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: '#CBD5E1',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '16px',
                  fontWeight: '600',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                Khôi phục bộ nhớ &amp; Đăng nhập lại
              </button>
            </div>
            {this.state.error && (
              <details style={{ marginTop: '18px', textAlign: 'left' }}>
                <summary style={{ fontSize: '11px', color: '#64748B', cursor: 'pointer', textAlign: 'center' }}>
                  Chi tiết kỹ thuật
                </summary>
                <pre style={{
                  fontSize: '10px',
                  color: '#F43F5E',
                  background: 'rgba(0, 0, 0, 0.3)',
                  padding: '8px 12px',
                  borderRadius: '10px',
                  marginTop: '8px',
                  overflowX: 'auto',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word'
                }}>
                  {String(this.state.error?.message || this.state.error)}
                </pre>
              </details>
            )}
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
