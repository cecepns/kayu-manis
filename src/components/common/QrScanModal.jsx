import { useState, useEffect, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import { X, Camera, QrCode, AlertCircle, Upload } from 'lucide-react';
import { productsAPI } from '../../utils/apiProducts';

const QrScanModal = ({ isOpen, onClose, onScan }) => {
  const [manualCode, setManualCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [hasCamera, setHasCamera] = useState(true);
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const scanIntervalRef = useRef(null);

  const stopCamera = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setScanning(false);
  }, []);

  const handleDetected = useCallback(async (text) => {
    if (!text) return;
    const trimmed = text.trim();
    stopCamera();
    onClose();

    // If it's a public product URL /public/product/:id, resolve to KM Code
    const match = trimmed.match(/\/public\/product\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      const prodId = match[1];
      try {
        const prod = await productsAPI.getProduct(prodId);
        if (prod && prod.km_code) {
          onScan(prod.km_code);
          return;
        }
      } catch (e) {
        console.warn('Could not resolve product ID from QR to km_code:', e);
      }
      onScan(prodId);
      return;
    }

    onScan(trimmed);
  }, [onClose, onScan, stopCamera]);

  const startCamera = useCallback(async () => {
    setErrorMsg('');
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setHasCamera(false);
        setErrorMsg('Browser Anda tidak mendukung akses kamera langsung.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setScanning(true);

        if ('BarcodeDetector' in window) {
          const barcodeDetector = new window.BarcodeDetector({
            formats: ['qr_code', 'code_128', 'code_39', 'ean_13', 'ean_8']
          });

          scanIntervalRef.current = setInterval(async () => {
            if (!videoRef.current || videoRef.current.readyState < 2) return;
            try {
              const barcodes = await barcodeDetector.detect(videoRef.current);
              if (barcodes && barcodes.length > 0) {
                const detected = barcodes[0].rawValue;
                if (detected) {
                  handleDetected(detected);
                }
              }
            } catch {
              // Ignore single-frame detection errors
            }
          }, 250);
        } else {
          // BarcodeDetector not natively available in this browser
          setErrorMsg('Deteksi barcode otomatis memerlukan browser yang mendukung BarcodeDetector (Chrome/Edge/Safari terbaru), atau unggah foto/ketik kode.');
        }
      }
    } catch {
      setHasCamera(false);
      setErrorMsg('Tidak dapat mengakses kamera. Pastikan izin kamera telah diberikan.');
    }
  }, [handleDetected]);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera]);

  const handleImageFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if ('BarcodeDetector' in window) {
      try {
        const barcodeDetector = new window.BarcodeDetector({
          formats: ['qr_code', 'code_128', 'code_39', 'ean_13', 'ean_8']
        });
        const bitmap = await createImageBitmap(file);
        const barcodes = await barcodeDetector.detect(bitmap);
        if (barcodes && barcodes.length > 0) {
          handleDetected(barcodes[0].rawValue);
          return;
        } else {
          setErrorMsg('QR / Barcode tidak terdeteksi pada gambar yang diunggah.');
        }
      } catch {
        setErrorMsg('Gagal membaca barcode dari gambar.');
      }
    } else {
      setErrorMsg('Browser Anda tidak mendukung deteksi gambar otomatis. Silakan ketik kodenya secara manual.');
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualCode.trim()) {
      handleDetected(manualCode.trim());
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary-100 text-primary-700 flex items-center justify-center">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-base">Scan QR / Barcode</h3>
              <p className="text-xs text-gray-500">Arahkan kamera ke QR produk KM</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera / Viewfinder */}
        <div className="p-5 space-y-4">
          <div className="relative bg-black rounded-xl overflow-hidden aspect-video flex items-center justify-center">
            {hasCamera ? (
              <video
                ref={videoRef}
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-center p-6 text-gray-300">
                <Camera className="w-10 h-10 mx-auto mb-2 text-gray-500" />
                <p className="text-xs">Kamera tidak aktif atau tidak diizinkan</p>
              </div>
            )}

            {scanning && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-48 h-48 border-2 border-primary-500 border-dashed rounded-lg animate-pulse" />
              </div>
            )}
          </div>

          {errorMsg && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 text-amber-800 rounded-lg text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Alternative: Upload Image / Capture Camera snapshot */}
          <div className="flex items-center gap-2">
            <label className="flex-1 btn-secondary text-xs py-2 px-3 inline-flex items-center justify-center cursor-pointer">
              <Upload className="w-3.5 h-3.5 mr-1.5" />
              Unggah Foto QR
              <input
                type="file"
                accept="image/*"
                onChange={handleImageFile}
                className="hidden"
              />
            </label>
            <label className="flex-1 btn-secondary text-xs py-2 px-3 inline-flex items-center justify-center cursor-pointer text-primary-700 bg-primary-50 hover:bg-primary-100 border-primary-200">
              <Camera className="w-3.5 h-3.5 mr-1.5" />
              Ambil Foto
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleImageFile}
                className="hidden"
              />
            </label>
          </div>

          {/* Alternative: Manual input or barcode scanner gun */}
          <form onSubmit={handleManualSubmit} className="pt-2 border-t border-gray-100">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Atau masukkan kode / scanner gun:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Contoh: KM-001 atau link QR"
                className="input-field text-xs py-2 flex-1"
                autoFocus
              />
              <button
                type="submit"
                disabled={!manualCode.trim()}
                className="btn-primary text-xs py-2 px-3 disabled:opacity-50"
              >
                Cari
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

QrScanModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onScan: PropTypes.func.isRequired,
};

export default QrScanModal;
