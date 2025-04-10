'use client';

import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import Cookies from 'js-cookie';
import { toast } from 'react-toastify';
import api from '../lib/api'; // Adjust path as needed
import { getLoginRedirectUrl } from '../config/env'; // Adjust path as needed
import { bankList, BankName } from './bankList';
import Loader from './Loader';
import { useRouter } from 'next/navigation';

interface WithdrawFundsOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onWithdrawSuccess: () => void;
  availableBalance: number;
}

export default function WithdrawFundsOverlay({
  isOpen,
  onClose,
  onWithdrawSuccess,
  availableBalance,
}: WithdrawFundsOverlayProps) {
  const [step, setStep] = useState(1);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [withdrawalType, setWithdrawalType] = useState('Payout Account');
  const [formData, setFormData] = useState({
    withdrawalAmount: '',
    destinationBank: '' as BankName | '',
    accountNumber: '',
    accountName: '',
    withdrawalPin: ['', '', '', '', '', ''],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePinChange = (index: number, value: string) => {
    if (/^\d?$/.test(value)) {
      const newPin = [...formData.withdrawalPin];
      newPin[index] = value;
      setFormData((prev) => ({ ...prev, withdrawalPin: newPin }));
      if (value && index < 5) {
        const nextInput = document.getElementById(`pin-${index + 1}`);
        nextInput?.focus();
      }
    }
  };

  const handleWithdraw = () => {
    if (!formData.withdrawalAmount || Number(formData.withdrawalAmount) > availableBalance) {
      toast.error('Please enter a valid amount within your balance.');
      return;
    }
    if (withdrawalType === 'External Account' && (!formData.destinationBank || !formData.accountNumber || !formData.accountName)) {
      toast.error('Please fill all required fields for external account withdrawal.');
      return;
    }
    setStep(2);
  };

  const handleSubmitPin = async () => {
    const pin = formData.withdrawalPin.join('');
    if (pin.length !== 6) {
      toast.error('Please enter a 6-digit PIN.');
      return;
    }

    setIsSubmitting(true);
    const accessToken = Cookies.get('accessToken');
    const sellerDataString = Cookies.get('sellerData');

    if (!accessToken || !sellerDataString) {
      toast.error('Authentication required. Please log in.');
      router.push(getLoginRedirectUrl('seller')); // Use centralized login URL
      return;
    }

    let userId: string;
    try {
      const sellerData = JSON.parse(sellerDataString);
      userId = sellerData.id;
    } catch (err) {
      console.error('WithdrawFundsOverlay - Error parsing seller data:', err);
      toast.error('Invalid session data. Please log in again.');
      router.push(getLoginRedirectUrl('seller')); // Use centralized login URL
      return;
    }

    try {
      const payload = {
        remark: `Withdrawal_${Date.now()}`,
        withdrawalType,
        amount: formData.withdrawalAmount,
        ...(withdrawalType === 'External Account' && {
          accountNumber: formData.accountNumber,
          accountName: formData.accountName,
          bankName: formData.destinationBank,
        }),
        withdrawalPin: pin,
      };

      const response = await api.post(
        `/wallets/seller/payout/withdraw?userType=SELLER&userId=${userId}`,
        payload,
        { timeout: 30000 }
      );

      if (response.data.message?.includes('successfully')) {
        toast.success('Withdrawal successful!');
        onWithdrawSuccess();
        setTimeout(() => onClose(), 2000);
      }
    } catch (error: any) {
      console.error('WithdrawFundsOverlay - Withdrawal error:', error.response?.data || error.message);
      const errorMessage = error.response?.data?.message || 'Unknown error';
      toast.error(`Failed to process withdrawal: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (overlayRef.current && !overlayRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const uniqueBanks = Array.from(new Set(bankList)).sort((a, b) => a.localeCompare(b));

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-gray-800/50 to-gray-900/50 z-50 flex justify-end">
      <div
        ref={overlayRef}
        className="bg-gradient-to-br from-white to-gray-50 w-full max-w-md h-full p-6 shadow-2xl rounded-l-2xl transform transition-transform duration-300 ease-in-out overflow-y-auto"
        style={{ transform: isOpen ? 'translateX(0)' : 'translateX(100%)' }}
      >
        <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-gray-200 rounded-full transition-colors">
          <Image src="/cancel.png" alt="Cancel" width={20} height={20} />
        </button>

        <h2 className="text-2xl font-extrabold text-[#011631] text-center mb-6">Withdraw Funds</h2>

        {step === 1 && (
          <div className="space-y-6">
            <div className="bg-[#F26E52]/10 p-4 rounded-lg text-center">
              <p className="text-sm text-gray-700 font-medium">Available Balance</p>
              <p className="text-3xl font-bold text-[#F26E52]">
                ₦{availableBalance.toLocaleString()}.00
              </p>
            </div>

            <div className="relative">
              <label htmlFor="withdrawalAmount" className="absolute -top-2 left-3 bg-white px-1 text-xs text-gray-700 font-medium">
                Withdrawal Amount
              </label>
              <input
                id="withdrawalAmount"
                type="number"
                name="withdrawalAmount"
                value={formData.withdrawalAmount}
                onChange={handleInputChange}
                placeholder="Enter amount"
                className="w-full h-12 px-4 pt-4 border border-gray-300 rounded-lg text-gray-800 focus:ring-2 focus:ring-[#F26E52] focus:border-transparent transition-all"
              />
            </div>

            <div className="space-y-3">
              <p className="text-sm text-gray-700 font-medium">Withdrawal Option</p>
              <div className="flex items-center space-x-6">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="withdrawalType"
                    value="Payout Account"
                    checked={withdrawalType === 'Payout Account'}
                    onChange={() => setWithdrawalType('Payout Account')}
                    className="w-4 h-4 text-[#F26E52] focus:ring-[#F26E52]"
                  />
                  <span className="text-sm text-gray-800">My Account</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="withdrawalType"
                    value="External Account"
                    checked={withdrawalType === 'External Account'}
                    onChange={() => setWithdrawalType('External Account')}
                    className="w-4 h-4 text-[#F26E52] focus:ring-[#F26E52]"
                  />
                  <span className="text-sm text-gray-800">Another Account</span>
                </label>
              </div>
            </div>

            {withdrawalType === 'External Account' && (
              <>
                <div className="relative">
                  <label htmlFor="destinationBank" className="absolute -top-2 left-3 bg-white px-1 text-xs text-gray-700 font-medium">
                    Destination Bank
                  </label>
                  <select
                    id="destinationBank"
                    name="destinationBank"
                    value={formData.destinationBank}
                    onChange={handleInputChange}
                    className="w-full h-12 px-4 pt-4 border border-gray-300 rounded-lg text-gray-800 focus:ring-2 focus:ring-[#F26E52] focus:border-transparent appearance-none transition-all"
                  >
                    <option value="" disabled>
                      Select Bank
                    </option>
                    {uniqueBanks.map((bank) => (
                      <option key={bank} value={bank}>
                        {bank}
                      </option>
                    ))}
                  </select>
                  <Image
                    src="/dropdown.png"
                    alt="Dropdown"
                    width={12}
                    height={12}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none"
                  />
                </div>

                <div className="relative">
                  <label htmlFor="accountNumber" className="absolute -top-2 left-3 bg-white px-1 text-xs text-gray-700 font-medium">
                    Account Number
                  </label>
                  <input
                    id="accountNumber"
                    type="text"
                    name="accountNumber"
                    value={formData.accountNumber}
                    onChange={handleInputChange}
                    placeholder="Account Number"
                    maxLength={10}
                    className="w-full h-12 px-4 pt-4 border border-gray-300 rounded-lg text-gray-800 focus:ring-2 focus:ring-[#F26E52] focus:border-transparent transition-all"
                  />
                </div>

                <div className="relative">
                  <label htmlFor="accountName" className="absolute -top-2 left-3 bg-white px-1 text-xs text-gray-700 font-medium">
                    Account Name
                  </label>
                  <input
                    id="accountName"
                    type="text"
                    name="accountName"
                    value={formData.accountName}
                    onChange={handleInputChange}
                    placeholder="Account Name"
                    className="w-full h-12 px-4 pt-4 border border-gray-300 rounded-lg text-gray-800 focus:ring-2 focus:ring-[#F26E52] focus:border-transparent transition-all"
                  />
                </div>
              </>
            )}

            <button
              onClick={handleWithdraw}
              disabled={!formData.withdrawalAmount}
              className="w-full h-12 rounded-lg bg-gradient-to-r from-[#F26E52] to-[#e65a3e] text-white text-base font-semibold hover:from-[#e65a3e] hover:to-[#d4462a] disabled:opacity-50 transition-all flex items-center justify-center shadow-md"
            >
              Proceed to Withdraw
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div className="flex items-center space-x-4">
              <button onClick={() => setStep(1)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                <Image src="/back.png" alt="Back" width={20} height={20} />
              </button>
              <div>
                <h3 className="text-xl font-bold text-[#011631]">Enter Your PIN</h3>
                <p className="text-sm text-gray-600">
                  Withdraw ₦{Number(formData.withdrawalAmount).toLocaleString()} to{' '}
                  {withdrawalType === 'Payout Account' ? 'your account' : `${formData.accountNumber}, ${formData.destinationBank}`}.
                </p>
              </div>
            </div>

            <div className="flex justify-center space-x-3">
              {formData.withdrawalPin.map((digit, index) => (
                <input
                  key={index}
                  id={`pin-${index}`}
                  type="text"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handlePinChange(index, e.target.value)}
                  className="w-12 h-12 bg-gray-100 border border-gray-300 rounded-full text-center text-xl font-semibold text-gray-800 focus:ring-2 focus:ring-[#F26E52] focus:border-transparent transition-all"
                />
              ))}
            </div>

            <button
              onClick={handleSubmitPin}
              disabled={isSubmitting || formData.withdrawalPin.some((digit) => !digit)}
              className="w-full h-12 rounded-lg bg-gradient-to-r from-[#F26E52] to-[#e65a3e] text-white text-base font-semibold hover:from-[#e65a3e] hover:to-[#d4462a] disabled:opacity-50 transition-all flex items-center justify-center shadow-md"
            >
              {isSubmitting ? <Loader /> : 'Confirm Withdrawal'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}