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
    localStorage.clear();
    sessionStorage.clear();
    window.location.reload();
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
          background: '#FFF5F7',
          color: '#1f2937',
          textAlign: 'center'
        }}>
          <div style={{
            maxWidth: '400px',
            background: 'white',
            padding: '32px 24px',
            borderRadius: '24px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            border: '1px solid #fee2e2'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>💖</div>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '8px' }}>
              LoveCare đang cập nhật dữ liệu
            </h2>
            <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '20px' }}>
              Ứng dụng vừa được cập nhật phiên bản mới. Bấm nút bên dưới để đồng bộ và tiếp tục sử dụng ngay nhé!
            </p>
            <button
              onClick={this.handleReset}
              style={{
                width: '100%',
                padding: '14px 20px',
                background: 'linear-gradient(to right, #ec4899, #f43f5e)',
                color: 'white',
                border: 'none',
                borderRadius: '16px',
                fontWeight: 'bold',
                fontSize: '14px',
                cursor: 'pointer',
                boxShadow: '0 10px 15px -3px rgba(244, 63, 94, 0.3)'
              }}
            >
              Làm Mới & Tiếp Tục Dùng
            </button>
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
