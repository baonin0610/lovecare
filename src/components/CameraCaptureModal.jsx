import React, { useState, useRef, useEffect } from 'react';
import { Camera, RefreshCw, X, Check, Image as ImageIcon, Sparkles, Droplets, Utensils } from 'lucide-react';
import confetti from 'canvas-confetti';
import { sounds } from '../services/audio';

export const CameraCaptureModal = ({ isOpen, onClose, reminder, onComplete }) => {
  const [stream, setStream] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [facingMode, setFacingMode] = useState('environment'); // 'user' (selfie) or 'environment' (back)
  const [cameraError, setCameraError] = useState(null);
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [waterAmount, setWaterAmount] = useState(reminder?.waterAmountMl || 300);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  // Initialize camera when modal opens
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setCapturedImage(null);
      setNote('');
      setCameraError(null);
      return;
    }

    if (reminder?.waterAmountMl) {
      setWaterAmount(reminder.waterAmountMl);
    }

    startCamera(facingMode);

    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode]);

  const startCamera = async (mode) => {
    stopCamera();
    setCameraError(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Trình duyệt không hỗ trợ trực tiếp mở Camera, vui lòng dùng nút chọn/chụp ảnh bên dưới.');
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
          width: { ideal: 1280 },
          height: { ideal: 960 }
        },
        audio: false
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.warn('Camera access error:', err);
      setCameraError(err.message || 'Không thể truy cập camera. Bạn có thể bấm nút Tải ảnh/Chụp ảnh máy ảnh bên dưới.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const switchCamera = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
  };

  // Capture frame from video to canvas with cute stamped watermark
  const takeSnapshot = () => {
    if (!videoRef.current) return;
    sounds.playCameraSnap();

    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement('canvas');
    canvas.width = video.videoWidth || 800;
    canvas.height = video.videoHeight || 600;

    const ctx = canvas.getContext('2d');

    // If front camera, mirror image
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Reset transform for watermark
    if (facingMode === 'user') {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }

    // Add watermark stamp
    const dateStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' • ' + new Date().toLocaleDateString('vi-VN');
    const badgeText = reminder?.type === 'meal' ? `${reminder.title}` : `Đã uống ${waterAmount}ml`;

    // Watermark background tag
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.roundRect ? ctx.roundRect(16, canvas.height - 68, 300, 48, 10) : ctx.fillRect(16, canvas.height - 68, 300, 48);
    ctx.fill();

    // Watermark text
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(badgeText, 28, canvas.height - 42);
    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#E2E8F0';
    ctx.fillText(dateStr + ' • Xác thực thời gian thực', 28, canvas.height - 25);

    // Export to blob / dataUrl
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `snap-${Date.now()}.jpg`, { type: 'image/jpeg' });
        setCapturedImage({
          file,
          previewUrl: URL.createObjectURL(blob)
        });
        stopCamera();
      }
    }, 'image/jpeg', 0.88);
  };

  // Fallback for file picker / native iOS camera
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      sounds.playCameraSnap();
      setCapturedImage({
        file,
        previewUrl: URL.createObjectURL(file)
      });
      stopCamera();
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    startCamera(facingMode);
  };

  const handleSubmit = async () => {
    if (!capturedImage?.file) return;

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('photo', capturedImage.file);
      formData.append('reminderId', reminder?.id || '');
      formData.append('type', reminder?.type || 'water');
      formData.append('title', reminder?.title || (reminder?.type === 'water' ? 'Uống nước' : 'Ăn uống'));
      formData.append('note', note);
      if (reminder?.type === 'water') {
        formData.append('waterAmountMl', waterAmount);
      }
      if (reminder?.mealCategory) {
        formData.append('mealCategory', reminder.mealCategory);
      }

      await onComplete(formData);

      // Trigger festive confetti & victory sound
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#FF6B8B', '#FF8E53', '#4ECDC4', '#FFE66D']
      });
      sounds.playSuccess();

      onClose();
    } catch (err) {
      alert('Có lỗi khi lưu ảnh check-in, vui lòng thử lại: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const isWater = reminder?.type === 'water';

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end sm:justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md mx-auto bg-white rounded-t-[28px] sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[96vh] safe-bottom">
        {/* Mobile Drag Indicator */}
        <div className="w-10 h-1 rounded-full bg-gray-300 mx-auto mt-2.5 mb-1 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-white">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${isWater ? 'bg-sky-100 text-sky-700' : 'bg-amber-100 text-amber-700'}`}>
              {isWater ? <Droplets className="w-4 h-4" /> : <Utensils className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm leading-tight">
                {reminder?.title || 'Chụp ảnh xác thực'}
              </h3>
              <p className="text-[11px] text-gray-500 font-medium">Chụp ảnh xác thực thời gian thực</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera View or Captured Photo */}
        <div className="relative bg-slate-900 aspect-[4/3] flex items-center justify-center overflow-hidden">
          {!capturedImage ? (
            <>
              {/* Live Video */}
              {!cameraError ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${facingMode === 'user' ? '-scale-x-100' : ''}`}
                />
              ) : (
                <div className="p-6 text-center text-white">
                  <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-white/10 flex items-center justify-center text-rose-400">
                    <Camera className="w-7 h-7" />
                  </div>
                  <p className="text-sm font-medium mb-4 text-gray-200">{cameraError}</p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-5 py-2.5 bg-gray-900 hover:bg-black rounded-full font-semibold text-sm shadow-lg flex items-center gap-2 mx-auto active:scale-95 transition text-white"
                  >
                    <Camera className="w-4 h-4" /> Mở Máy Ảnh / Chọn Ảnh
                  </button>
                </div>
              )}

              {/* Camera Controls Overlay */}
              {!cameraError && (
                <div className="absolute inset-x-0 bottom-3 flex items-center justify-around px-4">
                  {/* Gallery / File select */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-11 h-11 rounded-full bg-black/40 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/60 transition active:scale-90"
                    title="Chọn từ thư viện"
                  >
                    <ImageIcon className="w-5 h-5" />
                  </button>

                  {/* Main Shutter Button */}
                  <button
                    onClick={takeSnapshot}
                    className="w-16 h-16 rounded-full border-4 border-white bg-rose-500 hover:bg-rose-600 shadow-xl flex items-center justify-center text-white transition active:scale-90"
                    title="Chụp ảnh"
                  >
                    <div className="w-6 h-6 rounded-full bg-white" />
                  </button>

                  {/* Flip Front/Back Camera */}
                  <button
                    onClick={switchCamera}
                    className="w-11 h-11 rounded-full bg-black/40 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/60 transition active:scale-90"
                    title="Đổi camera trước / sau"
                  >
                    <RefreshCw className="w-5 h-5" />
                  </button>
                </div>
              )}
            </>
          ) : (
            /* Preview of captured photo */
            <div className="relative w-full h-full">
              <img
                src={capturedImage.previewUrl}
                alt="Captured"
                className="w-full h-full object-cover"
              />
              <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-400" /> Đã ghi nhận ảnh xác thực
              </div>
            </div>
          )}

          {/* Hidden file input for native camera or library */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {/* Bottom Details & Confirmation */}
        <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-4">
          {/* Water intake adjustment if type is water */}
          {isWater && (
            <div className="bg-sky-50 rounded-2xl p-3 border border-sky-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-sky-800 flex items-center gap-1">
                  <Droplets className="w-4 h-4 text-sky-500" /> Lượng nước vừa uống:
                </span>
                <span className="text-sm font-bold text-sky-600">{waterAmount} ml</span>
              </div>
              <div className="flex gap-2">
                {[150, 250, 350, 500].map(amt => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => {
                      setWaterAmount(amt);
                      sounds.playWaterDrop();
                    }}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition ${
                      waterAmount === amt
                        ? 'bg-sky-500 text-white shadow-md'
                        : 'bg-white text-sky-700 hover:bg-sky-100'
                    }`}
                  >
                    +{amt}ml
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Note input */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Ghi chú kèm theo:
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={isWater ? 'Vừa uống hết cốc nước' : 'Đã ăn uống đầy đủ'}
              className="w-full px-3.5 py-2.5 rounded-2xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent transition"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-1">
            {capturedImage ? (
              <>
                <button
                  type="button"
                  onClick={handleRetake}
                  disabled={isSubmitting}
                  className="flex-1 py-3 px-4 rounded-2xl font-bold text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 transition"
                >
                  Chụp lại
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex-[2] py-3 px-4 rounded-2xl font-bold text-sm bg-gray-900 hover:bg-black text-white shadow-lg flex items-center justify-center gap-2 active:scale-95 transition"
                >
                  {isSubmitting ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Check className="w-5 h-5" /> Gửi xác thực
                    </>
                  )}
                </button>
              </>
            ) : (
              <p className="text-center text-xs text-gray-500 w-full py-1">
                Bấm nút tròn để chụp ảnh hoặc chọn ảnh từ máy.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
