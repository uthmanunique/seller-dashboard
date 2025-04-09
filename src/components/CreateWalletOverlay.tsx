'use client';

import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import Cookies from 'js-cookie';
import axios from 'axios';
import { toast } from 'react-toastify';
import Loader from './Loader';
import { bankList, BankName } from './bankList';

interface CreateWalletOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onWalletCreated: () => void;
}

export default function CreateWalletOverlay({ isOpen, onClose, onWalletCreated }: CreateWalletOverlayProps) {
  const [step, setStep] = useState(1);
  const totalSteps = 3;
  const overlayRef = useRef<HTMLDivElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    businessName: '',
    phoneNumber: '',
    email: '',
    bvn: '',
    nin: '',
    dateOfBirth: '',
    gender: '',
    address: '',
    payoutAccountName: '',
    payoutAccountNumber: '',
    payoutBankName: '' as BankName | '',
    withdrawalPin: '',
    confirmPin: '',
  });
  const [showPin, setShowPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleReset = () => {
    setFormData({
      firstName: '',
      lastName: '',
      businessName: '',
      phoneNumber: '',
      email: '',
      bvn: '',
      nin: '',
      dateOfBirth: '',
      gender: '',
      address: '',
      payoutAccountName: '',
      payoutAccountNumber: '',
      payoutBankName: '',
      withdrawalPin: '',
      confirmPin: '',
    });
    setStep(1);
  };

  const handleNext = () => {
    if (step < totalSteps) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const isFormComplete = () => {
    const requiredFields = {
      firstName: formData.firstName,
      lastName: formData.lastName,
      businessName: formData.businessName,
      phoneNumber: formData.phoneNumber,
      email: formData.email,
      bvn: formData.bvn,
      nin: formData.nin,
      dateOfBirth: formData.dateOfBirth,
      gender: formData.gender,
      address: formData.address,
      payoutAccountName: formData.payoutAccountName,
      payoutAccountNumber: formData.payoutAccountNumber,
      payoutBankName: formData.payoutBankName,
      withdrawalPin: formData.withdrawalPin,
      confirmPin: formData.confirmPin,
    };
    return Object.values(requiredFields).every((value) => value && value !== '');
  };

  const handleCreateWallet = async () => {
    if (formData.withdrawalPin !== formData.confirmPin) {
      toast.error('Withdrawal pins do not match.');
      return;
    }
    if (!isFormComplete()) {
      toast.error('Please fill all required fields.');
      return;
    }
    if (!/^\d{6}$/.test(formData.withdrawalPin)) {
      toast.error('Withdrawal pin must be a 6-digit number.');
      return;
    }

    setIsSubmitting(true);
    try {
      const sellerDataString = Cookies.get('sellerData');
      if (!sellerDataString) {
        throw new Error('No seller data found. Please log in again.');
      }
      const sellerData = JSON.parse(sellerDataString);
      const userId = sellerData.id;
      const accessToken = Cookies.get('accessToken');

      const payload = {
        userId,
        firstName: formData.firstName,
        lastName: formData.lastName,
        businessName: formData.businessName,
        phoneNumber: formData.phoneNumber,
        email: formData.email,
        bvn: formData.bvn,
        nin: formData.nin,
        dob: formData.dateOfBirth,
        gender: formData.gender.toUpperCase(),
        address: formData.address,
        withdrawalPin: formData.withdrawalPin,
        payoutAccountName: formData.payoutAccountName,
        payoutAccountNumber: formData.payoutAccountNumber,
        payoutBankName: formData.payoutBankName,
      };

      const response = await axios.post(
        'https://api-rebrivo.onrender.com/v1/api/wallets/seller/create',
        payload,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (response.status === 200 || response.status === 201) {
        toast.success('Wallet created successfully!');
        sellerData.walletCreated = true;
        Cookies.set('sellerData', JSON.stringify(sellerData), { secure: true, sameSite: 'strict' });
        onWalletCreated();
        onClose();
      }
    } catch (error) {
      console.error('Raw error:', error);
      const errorMessage = axios.isAxiosError(error) && error.response?.data?.message
        ? error.response.data.message
        : 'Unknown error';
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        toast.info('Wallet already exists for this user.');
        const sellerData = JSON.parse(Cookies.get('sellerData') || '{}');
        sellerData.walletCreated = true;
        Cookies.set('sellerData', JSON.stringify(sellerData), { secure: true, sameSite: 'strict' });
        onWalletCreated();
        onClose();
      } else {
        toast.error(`Failed to create wallet: ${errorMessage}`);
      }
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
        <h2 className="text-2xl font-extrabold text-[#011631] text-center mb-6">Create Your Wallet</h2>

        <div className="flex items-center justify-center mb-6">
          <div className="flex-1 max-w-xs flex items-center space-x-2">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-2 flex-1 rounded-full transition-colors ${step >= s ? 'bg-[#F26E52]' : 'bg-gray-300'}`}
              ></div>
            ))}
          </div>
          <p className="text-xs text-gray-700 font-medium ml-4">Step {step} of {totalSteps}</p>
        </div>

        {step === 1 && (
          <div className="space-y-6">
            <div className="relative">
              <label htmlFor="firstName" className="absolute -top-2 left-3 bg-white px-1 text-xs text-gray-700 font-medium">
                First Name
              </label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                className="w-full h-12 px-4 pt-4 border border-gray-300 rounded-lg text-gray-800 focus:ring-2 focus:ring-[#F26E52] focus:border-transparent transition-all"
              />
            </div>
            <div className="relative">
              <label htmlFor="lastName" className="absolute -top-2 left-3 bg-white px-1 text-xs text-gray-700 font-medium">
                Last Name
              </label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                className="w-full h-12 px-4 pt-4 border border-gray-300 rounded-lg text-gray-800 focus:ring-2 focus:ring-[#F26E52] focus:border-transparent transition-all"
              />
            </div>
            <div className="relative">
              <label htmlFor="businessName" className="absolute -top-2 left-3 bg-white px-1 text-xs text-gray-700 font-medium">
                Business Name
              </label>
              <input
                type="text"
                id="businessName"
                name="businessName"
                value={formData.businessName}
                onChange={handleInputChange}
                className="w-full h-12 px-4 pt-4 border border-gray-300 rounded-lg text-gray-800 focus:ring-2 focus:ring-[#F26E52] focus:border-transparent transition-all"
              />
            </div>
            <div className="relative">
              <label htmlFor="phoneNumber" className="absolute -top-2 left-3 bg-white px-1 text-xs text-gray-700 font-medium">
                Phone Number
              </label>
              <input
                type="tel"
                id="phoneNumber"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleInputChange}
                className="w-full h-12 px-4 pt-4 border border-gray-300 rounded-lg text-gray-800 focus:ring-2 focus:ring-[#F26E52] focus:border-transparent transition-all"
              />
            </div>
            <div className="relative">
              <label htmlFor="email" className="absolute -top-2 left-3 bg-white px-1 text-xs text-gray-700 font-medium">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full h-12 px-4 pt-4 border border-gray-300 rounded-lg text-gray-800 focus:ring-2 focus:ring-[#F26E52] focus:border-transparent transition-all"
              />
            </div>
            <div className="flex justify-between space-x-4">
              <button
                onClick={handleReset}
                className="w-32 h-12 border border-[#F26E52] text-[#F26E52] rounded-lg text-base font-semibold hover:bg-[#F26E52]/10 transition-all"
              >
                Reset
              </button>
              <button
                onClick={handleNext}
                className="w-32 h-12 bg-gradient-to-r from-[#F26E52] to-[#e65a3e] text-white rounded-lg text-base font-semibold hover:from-[#e65a3e] hover:to-[#d4462a] transition-all shadow-md"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div className="relative">
              <label htmlFor="bvn" className="absolute -top-2 left-3 bg-white px-1 text-xs text-gray-700 font-medium">
                BVN
              </label>
              <input
                type="text"
                id="bvn"
                name="bvn"
                value={formData.bvn}
                onChange={handleInputChange}
                maxLength={11}
                className="w-full h-12 px-4 pt-4 border border-gray-300 rounded-lg text-gray-800 focus:ring-2 focus:ring-[#F26E52] focus:border-transparent transition-all"
              />
            </div>
            <div className="relative">
              <label htmlFor="nin" className="absolute -top-2 left-3 bg-white px-1 text-xs text-gray-700 font-medium">
                NIN
              </label>
              <input
                type="text"
                id="nin"
                name="nin"
                value={formData.nin}
                onChange={handleInputChange}
                maxLength={11}
                className="w-full h-12 px-4 pt-4 border border-gray-300 rounded-lg text-gray-800 focus:ring-2 focus:ring-[#F26E52] focus:border-transparent transition-all"
              />
            </div>
            <div className="relative">
              <label htmlFor="dateOfBirth" className="absolute -top-2 left-3 bg-white px-1 text-xs text-gray-700 font-medium">
                Date of Birth
              </label>
              <input
                type="date"
                id="dateOfBirth"
                name="dateOfBirth"
                value={formData.dateOfBirth}
                onChange={handleInputChange}
                className="w-full h-12 px-4 pt-4 border border-gray-300 rounded-lg text-gray-800 focus:ring-2 focus:ring-[#F26E52] focus:border-transparent transition-all"
              />
              {/* <Image
                // src="/calendar.png"
                alt="Calendar"
                width={16}
                height={16} */}
                {/* className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none" */}
              {/* /> */}
            </div>
            <div className="relative">
              <label htmlFor="gender" className="absolute -top-2 left-3 bg-white px-1 text-xs text-gray-700 font-medium">
                Gender
              </label>
              <select
                id="gender"
                name="gender"
                value={formData.gender}
                onChange={handleInputChange}
                className="w-full h-12 px-4 pt-4 border border-gray-300 rounded-lg text-gray-800 focus:ring-2 focus:ring-[#F26E52] focus:border-transparent appearance-none transition-all"
              >
                <option value="" disabled>
                  Select Gender
                </option>
                <option value="male">Male</option>
                <option value="female">Female</option>
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
              <label htmlFor="address" className="absolute -top-2 left-3 bg-white px-1 text-xs text-gray-700 font-medium">
                Address
              </label>
              <input
                type="text"
                id="address"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                className="w-full h-12 px-4 pt-4 border border-gray-300 rounded-lg text-gray-800 focus:ring-2 focus:ring-[#F26E52] focus:border-transparent transition-all"
              />
            </div>
            <div className="relative">
              <label htmlFor="payoutAccountName" className="absolute -top-2 left-3 bg-white px-1 text-xs text-gray-700 font-medium">
                Account Name
              </label>
              <input
                type="text"
                id="payoutAccountName"
                name="payoutAccountName"
                value={formData.payoutAccountName}
                onChange={handleInputChange}
                className="w-full h-12 px-4 pt-4 border border-gray-300 rounded-lg text-gray-800 focus:ring-2 focus:ring-[#F26E52] focus:border-transparent transition-all"
              />
            </div>
            <div className="relative">
              <label htmlFor="payoutAccountNumber" className="absolute -top-2 left-3 bg-white px-1 text-xs text-gray-700 font-medium">
                Account Number
              </label>
              <input
                type="text"
                id="payoutAccountNumber"
                name="payoutAccountNumber"
                value={formData.payoutAccountNumber}
                onChange={handleInputChange}
                maxLength={10}
                className="w-full h-12 px-4 pt-4 border border-gray-300 rounded-lg text-gray-800 focus:ring-2 focus:ring-[#F26E52] focus:border-transparent transition-all"
              />
            </div>
            <div className="relative">
              <label htmlFor="payoutBankName" className="absolute -top-2 left-3 bg-white px-1 text-xs text-gray-700 font-medium">
                Bank Name
              </label>
              <select
                id="payoutBankName"
                name="payoutBankName"
                value={formData.payoutBankName}
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
            <div className="flex justify-between space-x-4">
              <button
                onClick={handleBack}
                className="w-32 h-12 border border-[#F26E52] text-[#F26E52] rounded-lg text-base font-semibold hover:bg-[#F26E52]/10 transition-all"
              >
                Back
              </button>
              <button
                onClick={handleNext}
                className="w-32 h-12 bg-gradient-to-r from-[#F26E52] to-[#e65a3e] text-white rounded-lg text-base font-semibold hover:from-[#e65a3e] hover:to-[#d4462a] transition-all shadow-md"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div className="relative">
              <label htmlFor="withdrawalPin" className="absolute -top-2 left-3 bg-white px-1 text-xs text-gray-700 font-medium">
                Withdrawal Pin
              </label>
              <input
                type={showPin ? 'text' : 'password'}
                id="withdrawalPin"
                name="withdrawalPin"
                value={formData.withdrawalPin}
                onChange={handleInputChange}
                maxLength={6}
                className="w-full h-12 px-4 pt-4 border border-gray-300 rounded-lg text-gray-800 focus:ring-2 focus:ring-[#F26E52] focus:border-transparent transition-all"
              />
              <button
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 p-2"
              >
                <Image
                  src={showPin ? "/open.png" : "/close.png"}
                  alt="Toggle Visibility"
                  width={16}
                  height={16}
                />
              </button>
            </div>
            <div className="relative">
              <label htmlFor="confirmPin" className="absolute -top-2 left-3 bg-white px-1 text-xs text-gray-700 font-medium">
                Confirm Pin
              </label>
              <input
                type={showConfirmPin ? 'text' : 'password'}
                id="confirmPin"
                name="confirmPin"
                value={formData.confirmPin}
                onChange={handleInputChange}
                maxLength={6}
                className="w-full h-12 px-4 pt-4 border border-gray-300 rounded-lg text-gray-800 focus:ring-2 focus:ring-[#F26E52] focus:border-transparent transition-all"
              />
              <button
                onClick={() => setShowConfirmPin(!showConfirmPin)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 p-2"
              >
                <Image
                  src={showConfirmPin ? "/open.png" : "/close.png"}
                  alt="Toggle Visibility"
                  width={16}
                  height={16}
                />
              </button>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-700">Pin Requirements</p>
              <ul className="list-disc list-inside text-xs text-gray-600">
                <li>Must be numbers only</li>
                <li>Must be 6 digits long, without spaces</li>
              </ul>
            </div>
            <div className="flex justify-between space-x-4">
              <button
                onClick={handleBack}
                className="w-32 h-12 border border-[#F26E52] text-[#F26E52] rounded-lg text-base font-semibold hover:bg-[#F26E52]/10 transition-all"
              >
                Back
              </button>
              <button
                onClick={handleCreateWallet}
                disabled={isSubmitting}
                className="w-36 h-12 bg-gradient-to-r from-[#F26E52] to-[#e65a3e] text-white rounded-lg text-base font-semibold hover:from-[#e65a3e] hover:to-[#d4462a] disabled:opacity-50 transition-all flex items-center justify-center shadow-md"
              >
                {isSubmitting ? <Loader /> : 'Create Wallet'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}