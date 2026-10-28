import React, { useState } from 'react';
import { Copy, Check, ArrowRight, ShieldCheck, HeartHandshake, Loader2, Share2, Smartphone } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const CoupleConnectView = ({ onConnected }) => {
  const { user, couple, showToast } = useAuth();
  const [partnerCode, setPartnerCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const isGirlfriend = user?.role === 'lover';
  const myCode = couple?.code || '';

  // Handle Boyfriend entering Girlfriend's code
  const handleConnectByCode = async (e) => {
    e.preventDefault();
    if (!partnerCode.trim()) {
      setError('Vui lòng nhập mã kết nối do bạn gái gửi');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/couple/connect-by-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify({ code: partnerCode.trim().toUpperCase() })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Không thể kết nối');
      }

      showToast(`Đã kết nối thành công với ${data.couple?.name || 'bạn gái'}!`);
      if (onConnected) onConnected(data.couple);
      window.location.reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Girlfriend copying her code
  const handleCopyCode = () => {
    const message = `Em gửi anh mã kết nối LoveCare: ${myCode}. Anh vào app nhập mã này để chúng mình kết nối với nhau nhé!`;
    navigator.clipboard.writeText(message);
    setCopied(true);
    showToast('Đã sao chép mã và lời nhắn');
    setTimeout(() => setCopied(false), 3000);
  };

  // Girlfriend sharing via native share sheet or messaging
  const handleShare = async () => {
    const text = `Em gửi anh mã kết nối LoveCare: ${myCode}. Anh vào app nhập mã này để chúng mình kết nối với nhau nhé!`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Kết nối LoveCare',
          text,
          url: window.location.origin
        });
      } catch (err) {
        console.log('Share canceled');
      }
    } else {
      handleCopyCode();
    }
  };

  return (
    <div className="max-w-md mx-auto py-8 px-4">
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-gray-100 text-center">
        {/* Top Minimalist Icon */}
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center border border-rose-100">
          <HeartHandshake className="w-8 h-8" />
        </div>

        {isGirlfriend ? (
          /* ================= GIRLFRIEND VIEW: SHOWS CODE TO SEND ================= */
          <div>
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">
              Mã Kết Nối Của Bạn
            </h2>
            <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto leading-relaxed">
              Gửi mã này cho bạn trai. Khi anh ấy nhập mã, hai tài khoản sẽ tự động đồng bộ thời gian thực.
            </p>

            {/* Big Code Display */}
            <div className="my-6 p-5 rounded-2xl bg-rose-50/70 border border-rose-200">
              <span className="text-xs uppercase tracking-wider font-semibold text-rose-600 block mb-1">
                Mã phòng đôi của bạn
              </span>
              <span className="font-mono text-3xl font-black text-rose-600 tracking-widest selection:bg-rose-200">
                {myCode || 'Đang tạo...'}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2.5">
              <button
                onClick={handleCopyCode}
                className="w-full py-3.5 px-4 bg-gray-900 hover:bg-black text-white rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-95 transition"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Đã sao chép vào bộ nhớ tạm' : 'Sao chép mã gửi bạn trai'}
              </button>

              <button
                onClick={handleShare}
                className="w-full py-3 px-4 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-2xl font-semibold text-sm border border-rose-200 flex items-center justify-center gap-2 active:scale-95 transition"
              >
                <Share2 className="w-4 h-4" /> Chia sẻ qua Zalo / Tin nhắn
              </button>
            </div>

            {/* Live Waiting Status Indicator */}
            <div className="mt-8 pt-5 border-t border-gray-100 flex items-center justify-center gap-2 text-xs text-gray-500">
              <Loader2 className="w-4 h-4 text-rose-500 animate-spin" />
              <span>Đang chờ bạn trai nhập mã để bắt đầu...</span>
            </div>
          </div>
        ) : (
          /* ================= BOYFRIEND VIEW: ENTERS HER CODE ================= */
          <div>
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">
              Kết Nối Với Bạn Gái
            </h2>
            <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto leading-relaxed">
              Nhập mã kết nối do bạn gái gửi cho bạn để bắt đầu theo dõi và nhắc nhở cô ấy mỗi ngày.
            </p>

            {error && (
              <div className="mt-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium text-left">
                {error}
              </div>
            )}

            <form onSubmit={handleConnectByCode} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 text-left">
                  Mã kết nối (VD: LC-8392):
                </label>
                <input
                  type="text"
                  value={partnerCode}
                  onChange={(e) => setPartnerCode(e.target.value.toUpperCase())}
                  placeholder="Nhập mã tại đây"
                  className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 text-center font-mono text-xl font-bold tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent transition"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 bg-gray-900 hover:bg-black text-white rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-95 transition"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>Kết nối ngay</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 pt-4 border-t border-gray-100 text-xs text-gray-400 flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Dữ liệu phòng đôi được mã hóa riêng tư</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
