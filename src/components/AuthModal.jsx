import React, { useState, useEffect } from 'react';
import { Heart, User, Key, Sparkles, Smartphone, ArrowRight, ShieldCheck, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { IS_DEV_MODE } from '../config';

export const AuthModal = ({ isOpen, onClose, initialMode = 'login' }) => {
  const { login, quickSwitch, showToast } = useAuth();
  const [isRegister, setIsRegister] = useState(initialMode === 'register');
  const [role, setRole] = useState('caretaker'); // 'caretaker' or 'lover'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [coupleCode, setCoupleCode] = useState('');
  const [coupleName, setCoupleName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setIsRegister(initialMode === 'register');
  }, [initialMode, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
      const payload = isRegister
        ? {
            username: username.trim(),
            password: password.trim(),
            name: name.trim(),
            role,
            coupleCode: coupleCode.trim() || undefined,
            createCoupleName: coupleName.trim() || undefined
          }
        : { username: username.trim(), password: password.trim() };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Có lỗi xảy ra');
      }

      login(data.user, data.couple);
      if (data.loverName && data.user.role === 'caretaker') {
        showToast(`Đã kết nối với bạn gái tên: ${data.loverName}`);
      }
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-md mx-auto bg-white rounded-t-[28px] sm:rounded-3xl p-6 sm:p-7 shadow-2xl border border-gray-100 max-h-[94vh] overflow-y-auto safe-bottom">
        {/* Mobile Drag Indicator */}
        <div className="w-10 h-1 rounded-full bg-gray-300 mx-auto -mt-2 mb-4 sm:hidden" />
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-400 flex items-center justify-center text-white shadow-lg shadow-pink-500/30">
            <Heart className="w-8 h-8 fill-white" />
          </div>
          <h3 className="text-2xl font-black text-gray-800">
            {isRegister ? 'Đăng Ký Tài Khoản Cặp Đôi' : 'Đăng Nhập LoveCare'}
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            {isRegister
              ? 'Tạo tài khoản để bắt đầu nhắc nhở & chăm sóc người yêu'
              : 'Đăng nhập vào không gian yêu thương của hai bạn'}
          </p>
        </div>

        {/* Dev Mode Quick Switcher - ONLY VISIBLE TO DEVELOPERS */}
        {IS_DEV_MODE && (
          <div className="bg-amber-50 rounded-2xl p-3 border border-amber-200 mb-5">
            <p className="text-xs font-bold text-amber-800 mb-2 flex items-center gap-1.5">
              <span>[Dev Only] Thử nghiệm nhanh 1 chạm:</span>
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  quickSwitch('caretaker');
                  onClose();
                }}
                className="py-2 px-3 rounded-xl bg-white hover:bg-amber-100/60 text-amber-900 text-xs font-bold border border-amber-300 flex items-center justify-center gap-1.5 transition active:scale-95"
              >
                <span>Anh Yêu (Bạn trai)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  quickSwitch('lover');
                  onClose();
                }}
                className="py-2 px-3 rounded-xl bg-white hover:bg-amber-100/60 text-amber-900 text-xs font-bold border border-amber-300 flex items-center justify-center gap-1.5 transition active:scale-95"
              >
                <span>Em Yêu (Bạn gái)</span>
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {isRegister && (
            <>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Vai trò của bạn:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole('caretaker')}
                    className={`py-2.5 rounded-xl font-semibold text-xs transition border ${
                      role === 'caretaker'
                        ? 'border-gray-900 bg-gray-900 text-white shadow-sm'
                        : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Bạn trai
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('lover')}
                    className={`py-2.5 rounded-xl font-semibold text-xs transition border ${
                      role === 'lover'
                        ? 'border-gray-900 bg-gray-900 text-white shadow-sm'
                        : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Bạn gái
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Tên hiển thị:</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={role === 'caretaker' ? 'VD: Nam' : 'VD: Linh'}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-rose-400"
                  required
                />
              </div>

              {role === 'caretaker' ? (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Mã kết nối do bạn gái gửi (nếu có):
                  </label>
                  <input
                    type="text"
                    value={coupleCode}
                    onChange={(e) => setCoupleCode(e.target.value)}
                    placeholder="VD: LC-8392 (có thể nhập sau khi đăng nhập)"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs uppercase font-mono focus:outline-none focus:ring-2 focus:ring-rose-400"
                  />
                </div>
              ) : (
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-[11px] text-gray-600 leading-relaxed">
                  Sau khi đăng ký, hệ thống sẽ tự động tạo một mã kết nối riêng để bạn gửi qua tin nhắn cho bạn trai.
                </div>
              )}
            </>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Tên đăng nhập:</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Nhập tên đăng nhập"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Mật khẩu:</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-gray-900 hover:bg-black text-white font-semibold rounded-2xl shadow-sm flex items-center justify-center gap-2 active:scale-95 transition mt-3 text-sm"
          >
            {loading ? 'Đang xử lý...' : isRegister ? 'Đăng ký tài khoản' : 'Đăng nhập'}
          </button>
        </form>

        <div className="mt-5 pt-4 border-t border-gray-100 text-center">
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setError('');
            }}
            className="text-xs font-semibold text-gray-600 hover:text-gray-900 transition"
          >
            {isRegister
              ? 'Đã có tài khoản? Bấm để đăng nhập'
              : 'Chưa có tài khoản? Bấm để đăng ký tài khoản mới'}
          </button>
        </div>
      </div>
    </div>
  );
};
