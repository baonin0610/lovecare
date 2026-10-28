import React from 'react';
import { Smartphone, Share, PlusSquare, CheckCircle, X, Sparkles } from 'lucide-react';

export const PwaInstallGuide = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-pink-100 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-400 flex items-center justify-center text-white shadow-lg shadow-pink-500/30">
            <Smartphone className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-extrabold text-gray-800">
            Cài đặt App trên iPhone
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Không cần App Store! Chỉ 10 giây để đưa LoveCare ra màn hình chính iPhone như ứng dụng thật.
          </p>
        </div>

        {/* Step-by-step visual cards */}
        <div className="space-y-3.5 mb-6">
          <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-pink-50/70 border border-pink-100">
            <div className="w-7 h-7 rounded-full bg-pink-500 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
              1
            </div>
            <div>
              <p className="text-sm font-bold text-gray-800">Mở Safari trên iPhone</p>
              <p className="text-xs text-gray-600 mt-0.5">
                Đảm bảo bạn đang mở trang web này bằng trình duyệt <strong>Safari</strong> trên iPhone.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-pink-50/70 border border-pink-100">
            <div className="w-7 h-7 rounded-full bg-pink-500 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
              2
            </div>
            <div>
              <p className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                Bấm nút Chia sẻ <Share className="w-4 h-4 text-sky-600 inline" />
              </p>
              <p className="text-xs text-gray-600 mt-0.5">
                Nằm ở thanh công cụ phía dưới cùng của Safari (biểu tượng hình vuông có mũi tên trỏ lên).
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-pink-50/70 border border-pink-100">
            <div className="w-7 h-7 rounded-full bg-pink-500 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
              3
            </div>
            <div>
              <p className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                Chọn "Thêm vào MH chính" <PlusSquare className="w-4 h-4 text-emerald-600 inline" />
              </p>
              <p className="text-xs text-gray-600 mt-0.5">
                Cuộn danh sách xuống một chút và bấm vào <strong>"Thêm vào Màn hình chính" (Add to Home Screen)</strong>.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-pink-50/70 border border-pink-100">
            <div className="w-7 h-7 rounded-full bg-pink-500 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
              4
            </div>
            <div>
              <p className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                Bấm "Thêm" (Add) ở góc trên <CheckCircle className="w-4 h-4 text-rose-600 inline" />
              </p>
              <p className="text-xs text-gray-600 mt-0.5">
                Icon LoveCare màu hồng xinh xắn sẽ xuất hiện ngay trên màn hình iPhone, bấm vào dùng full-screen như app gốc!
              </p>
            </div>
          </div>
        </div>

        <div className="bg-amber-50 rounded-2xl p-3 border border-amber-200 text-xs text-amber-900 flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-amber-600 shrink-0" />
          <span>
            Sau khi thêm ra MH chính, mở app từ icon đó sẽ không còn thanh địa chỉ Safari, chụp ảnh cực kỳ tiện lợi!
          </span>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-bold rounded-2xl shadow-lg shadow-pink-500/30 transition active:scale-95"
        >
          Đã hiểu, đóng hướng dẫn
        </button>
      </div>
    </div>
  );
};
