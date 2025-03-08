import React, { useState, useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import qrService from '../services/qrService';
import { FaTimes, FaCheck, FaSpinner } from 'react-icons/fa';

const QRScanner = ({ onClose }) => {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [bookingDetails, setBookingDetails] = useState(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [scanner, setScanner] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isScannerActive, setIsScannerActive] = useState(true);

  useEffect(() => {
    let qrScanner = null;

    // Small delay to ensure DOM is ready
    const initializeScanner = setTimeout(() => {
      qrScanner = new Html5QrcodeScanner('reader', {
        qrbox: {
          width: 250,
          height: 250,
        },
        fps: 10,
        aspectRatio: 1.0,
        formatsToSupport: ["QR_CODE"],
        showTorchButtonIfSupported: true,
        disableFlip: false,
        verbose: false
      });

      setScanner(qrScanner);

      qrScanner.render(async (decodedText) => {
        if (isProcessing || isConfirming || !isScannerActive) return;
        
        try {
          setIsProcessing(true);
          setIsScannerActive(false);
          console.log('Scanning QR code:', decodedText); // Debug log
          const result = await qrService.validateQRCode(decodedText);
          console.log('Validation result:', result); // Debug log
          
          if (result.requireConfirmation) {
            setBookingDetails(result.bookingDetails);
            setIsConfirming(true);
          } else {
            setSuccess('QR code validated successfully!');
            setTimeout(() => {
              setSuccess('');
              onClose();
            }, 2000);
          }
        } catch (error) {
          console.error('QR validation error:', error);
          setError(error.message || 'Failed to validate QR code');
          setTimeout(() => {
            setError('');
            setIsScannerActive(true);
          }, 3000);
        } finally {
          setIsProcessing(false);
        }
      }, (error) => {
        // Only log scanning errors, don't show to user
        if (error?.message?.includes("No MultiFormat Readers")) return;
        console.warn('QR code scan warning:', error);
      });
    }, 100);

    return () => {
      clearTimeout(initializeScanner);
      if (qrScanner) {
        qrScanner.clear().catch(console.error);
      }
    };
  }, []);

  const handleConfirmValidation = async () => {
    try {
      setIsProcessing(true);
      console.log('Confirming validation for booking:', bookingDetails); // Debug log
      const result = await qrService.validateQRCode(bookingDetails.qrCode, true);
      console.log('Confirmation result:', result); // Debug log
      setSuccess('Check-in confirmed successfully!');
      setTimeout(() => {
        setSuccess('');
        onClose();
      }, 2000);
    } catch (error) {
      console.error('Validation error:', error);
      setError(error.message || 'Failed to validate QR code');
      setTimeout(() => setError(''), 3000);
      setIsScannerActive(true);
    } finally {
      setIsProcessing(false);
      setIsConfirming(false);
    }
  };

  const handleCancelValidation = () => {
    setBookingDetails(null);
    setIsConfirming(false);
    setIsScannerActive(true);
    setError('');
  };

  const handleClose = () => {
    if (scanner) {
      scanner.clear().catch(console.error);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-black/70 to-gray-900/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-xl shadow-2xl max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-800">Scan QR Code</h2>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <FaTimes />
          </button>
        </div>

        {error && (
          <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg">
            {success}
          </div>
        )}

        {isConfirming && bookingDetails ? (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800">Confirm Check-in</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="mb-2"><strong>Customer:</strong> {bookingDetails.userName}</p>
              <p className="mb-2"><strong>Queue Position:</strong> #{bookingDetails.queuePosition}</p>
              <p className="mb-2"><strong>Date:</strong> {bookingDetails.date}</p>
              <p><strong>Status:</strong> {bookingDetails.status}</p>
            </div>
            <div className="flex justify-end space-x-4 mt-6">
              <button
                onClick={handleCancelValidation}
                className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors duration-200"
                disabled={isProcessing}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmValidation}
                className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors duration-200 flex items-center"
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <FaSpinner className="animate-spin mr-2" />
                    Processing...
                  </>
                ) : (
                  <>
                    <FaCheck className="mr-2" />
                    Confirm Check-in
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div id="reader" className="w-full"></div>
            <p className="text-sm text-gray-600 text-center mt-4">
              Position the QR code within the frame to scan
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default QRScanner; 