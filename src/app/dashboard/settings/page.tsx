'use client';

import { useState, useEffect, ChangeEvent } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import Cookies from 'js-cookie';
import api from '../../../lib/api'; // Adjust path as needed
import { getLoginRedirectUrl } from '../../../config/env'; // Adjust path as needed

interface SellerData {
  id: string;
  role: string;
  email: string;
  firstName?: string;
  lastName?: string;
  profilePicture?: string;
  walletCreated?: boolean;
  is2faEnabled?: boolean;
  requestPasswordChange?: boolean;
}

interface UserDetails {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  twoFactorAuth: boolean;
  askPasswordChange: boolean;
}

interface AlertSetting {
  topic: string;
  enabled: boolean;
}

export default function Settings() {
  const [activeTab, setActiveTab] = useState('Authentication');
  const [userDetails, setUserDetails] = useState<UserDetails>({
    email: '',
    password: '********',
    firstName: '',
    lastName: '',
    twoFactorAuth: false,
    askPasswordChange: false,
  });
  const [alertSettings, setAlertSettings] = useState<AlertSetting[]>([]);
  const [isEmailEditable, setIsEmailEditable] = useState(false);
  const [isPasswordEditable, setIsPasswordEditable] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchSettings = () => {
      setIsLoading(true);
      const accessToken = Cookies.get('accessToken');
      const sellerDataString = Cookies.get('sellerData');

      if (!accessToken || !sellerDataString) {
        console.log('Settings - No tokens or seller data, redirecting to login');
        router.push(getLoginRedirectUrl('seller')); // Use centralized login URL
        return;
      }

      try {
        const sellerData: SellerData = JSON.parse(sellerDataString);
        if (!sellerData.id) {
          console.error('Settings - No seller ID in sellerData');
          setError('Invalid session data. Please log in again.');
          router.push(getLoginRedirectUrl('seller')); // Use centralized login URL
          return;
        }

        setUserDetails({
          email: sellerData.email || '',
          password: '********',
          firstName: sellerData.firstName || '',
          lastName: sellerData.lastName || '',
          twoFactorAuth: sellerData.is2faEnabled === true,
          askPasswordChange: sellerData.requestPasswordChange === true,
        });

        if (sellerData.profilePicture) {
          setProfilePicture(sellerData.profilePicture);
        }

        setAlertSettings([
          { topic: 'New Buyer Msg', enabled: true },
          { topic: 'Payment Alerts', enabled: true },
          { topic: 'Listing Expiry', enabled: false },
          { topic: 'Messages', enabled: true },
          { topic: 'Transaction Updates', enabled: true },
          { topic: 'Announcements', enabled: true },
        ]);
      } catch (err) {
        console.error('Settings - Error processing settings data:', err);
        setError('Failed to load settings. Please try again.');
        toast.error('Failed to load settings.');
        router.push(getLoginRedirectUrl('seller')); // Use centralized login URL
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, [router]);

  const handleProfilePictureUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setError('Please select an image file.');
      return;
    }

    setIsLoading(true);
    const accessToken = Cookies.get('accessToken');
    const sellerDataString = Cookies.get('sellerData');

    if (!accessToken || !sellerDataString) {
      router.push(getLoginRedirectUrl('seller')); // Use centralized login URL
      return;
    }

    const sellerData = JSON.parse(sellerDataString);
    const formData = new FormData();
    formData.append('profilePictureUrl', file);

    try {
      const response = await api.post(
        `/seller/settings/update-profile-picture?userType=SELLER&userId=${sellerData.id}`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
        }
      );

      if (response.status === 200) {
        const imageUrl = response.data.profilePictureUrl || URL.createObjectURL(file); // Use server URL if provided
        setProfilePicture(imageUrl);
        const updatedSellerData = { ...sellerData, profilePicture: imageUrl };
        localStorage.setItem('sellerData', JSON.stringify(updatedSellerData));
        Cookies.set('sellerData', JSON.stringify(updatedSellerData));
        toast.success(response.data.message);
      }
    } catch (err: any) {
      console.error('Settings - Error uploading profile picture:', err.response?.data || err.message);
      setError('Failed to update profile picture.');
      toast.error('Failed to update profile picture.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestOtp = async () => {
    setIsLoading(true);
    const accessToken = Cookies.get('accessToken');
    if (!accessToken) {
      router.push(getLoginRedirectUrl('seller')); // Use centralized login URL
      return;
    }

    try {
      const response = await api.post('/auth/generate-otp', { email: userDetails.email });
      if (response.status === 201) {
        toast.success(response.data.message);
      }
    } catch (err: any) {
      console.error('Settings - Error requesting OTP:', err.response?.data || err.message);
      setError('Failed to request OTP.');
      toast.error('Failed to request OTP.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSave = async () => {
    if (!currentPassword || !newPassword) {
      setError('Please enter current and new password.');
      return;
    }
    setIsLoading(true);
    const accessToken = Cookies.get('accessToken');
    const sellerDataString = Cookies.get('sellerData');

    if (!accessToken || !sellerDataString) {
      router.push(getLoginRedirectUrl('seller')); // Use centralized login URL
      return;
    }

    const sellerData = JSON.parse(sellerDataString);

    try {
      const payload = {
        currentPassword,
        newPassword,
      };
      const response = await api.post(
        `/seller/settings/change-password?userType=SELLER&userId=${sellerData.id}`,
        payload
      );
      if (response.status === 200) {
        setCurrentPassword('');
        setNewPassword('');
        setIsPasswordEditable(false);
        toast.success(response.data.message);
        // Log out
        Cookies.remove('accessToken');
        Cookies.remove('sellerData');
        localStorage.removeItem('sellerData');
        router.push(getLoginRedirectUrl('seller')); // Use centralized login URL
      }
    } catch (err: any) {
      console.error('Settings - Error changing password:', err.response?.data || err.message);
      setError('Failed to change password.');
      toast.error('Failed to change password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailSave = async () => {
    if (!newEmail || !otp) {
      setError('Please enter new email and OTP.');
      return;
    }
    setIsLoading(true);
    const accessToken = Cookies.get('accessToken');
    const sellerDataString = Cookies.get('sellerData');

    if (!accessToken || !sellerDataString) {
      router.push(getLoginRedirectUrl('seller')); // Use centralized login URL
      return;
    }

    const sellerData = JSON.parse(sellerDataString);

    try {
      const payload = {
        oldEmail: userDetails.email,
        newEmail,
        otp,
      };
      const response = await api.post(
        `/seller/settings/update-email?userType=SELLER&userId=${sellerData.id}`, // Corrected endpoint
        payload
      );
      if (response.status === 200) {
        setUserDetails((prev) => ({ ...prev, email: newEmail }));
        const updatedSellerData = { ...sellerData, email: newEmail };
        localStorage.setItem('sellerData', JSON.stringify(updatedSellerData));
        Cookies.set('sellerData', JSON.stringify(updatedSellerData));
        setNewEmail('');
        setOtp('');
        setIsEmailEditable(false);
        toast.success(response.data.message);
        // Log out
        Cookies.remove('accessToken');
        Cookies.remove('sellerData');
        localStorage.removeItem('sellerData');
        router.push(getLoginRedirectUrl('seller')); // Use centralized login URL
      }
    } catch (err: any) {
      console.error('Settings - Error changing email:', err.response?.data || err.message);
      setError('Failed to change email.');
      toast.error('Failed to change email.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAlertUpdate = async () => {
    setIsLoading(true);
    const accessToken = Cookies.get('accessToken');
    const sellerDataString = Cookies.get('sellerData');

    if (!accessToken || !sellerDataString) {
      router.push(getLoginRedirectUrl('seller')); // Use centralized login URL
      return;
    }

    const sellerData = JSON.parse(sellerDataString);

    try {
      const payload = {
        is2faEnabled: userDetails.twoFactorAuth,
        requestPasswordChange: userDetails.askPasswordChange,
        enableMessages: alertSettings.find((a) => a.topic === 'Messages')?.enabled || false,
        enableTransactionAndEscrowUpdates:
          alertSettings.find((a) => a.topic === 'Transaction Updates')?.enabled || false,
        enableNewListingsUpdates: alertSettings.find((a) => a.topic === 'Listing Expiry')?.enabled || false,
        enableAnnouncementsAndOffers: alertSettings.find((a) => a.topic === 'Announcements')?.enabled || false,
      };
      const response = await api.post(
        `/seller/settings/update-alerts?userType=SELLER&userId=${sellerData.id}`,
        payload
      );
      if (response.status === 200) {
        const updatedSellerData = {
          ...sellerData,
          is2faEnabled: userDetails.twoFactorAuth,
          requestPasswordChange: userDetails.askPasswordChange,
        };
        localStorage.setItem('sellerData', JSON.stringify(updatedSellerData));
        Cookies.set('sellerData', JSON.stringify(updatedSellerData));
        toast.success(response.data.message);
      }
    } catch (err: any) {
      console.error('Settings - Error updating alerts:', err.response?.data || err.message);
      setError('Failed to update alerts.');
      toast.error('Failed to update alerts.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleAuth = (key: 'twoFactorAuth' | 'askPasswordChange') => {
    setUserDetails((prev) => ({ ...prev, [key]: !prev[key] }));
    handleAlertUpdate();
  };

  const handleToggleAlert = (index: number) => {
    const updatedAlerts = [...alertSettings];
    updatedAlerts[index].enabled = !updatedAlerts[index].enabled;
    setAlertSettings(updatedAlerts);
    handleAlertUpdate();
  };

  if (isLoading && !userDetails.email) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Image src="/loader.gif" alt="Loading" width={32} height={32} className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex space-x-4 border-b border-gray-200 mb-6">
        {['Authentication', 'Alert Configuration'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-2 text-sm font-semibold ${
              activeTab === tab
                ? 'text-[#F26E52] border-b-2 border-[#F26E52]'
                : 'text-gray-600 hover:text-[#F26E52]'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Authentication' && (
        <div className="w-2/3">
          <h2 className="text-xl font-bold text-[#011631] mb-2">Personal Details</h2>
          <p className="text-xs text-gray-600 mb-6">You can change your Email and Password here</p>

          <div className="flex flex-col items-start mb-6">
            <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
              {profilePicture ? (
                <Image src={profilePicture} alt="Profile" width={96} height={96} className="object-cover" />
              ) : (
                <Image src="/profile.png" alt="Profile" width={48} height={48} />
              )}
            </div>
            <label htmlFor="profilePictureInput" className="mt-2 cursor-pointer">
              <Image src="/edit.png" alt="Edit Profile" width={16} height={16} />
              <input
                id="profilePictureInput"
                type="file"
                accept="image/*"
                onChange={handleProfilePictureUpload}
                className="hidden"
                disabled={isLoading}
              />
            </label>
            <p className="mt-2 text-sm text-[#011631]">
              {userDetails.firstName} {userDetails.lastName}
            </p>
          </div>

          <div className="space-y-4 mb-6">
            <div className="space-y-1">
              <label htmlFor="email" className="text-sm text-gray-600 text-left block">
                Email
              </label>
              <div className="flex items-center space-x-2">
                <input
                  id="email"
                  type="email"
                  value={userDetails.email ?? ''}
                  disabled
                  className="w-full h-10 px-4 border text-gray-600 rounded-lg bg-gray-100"
                />
                <button
                  onClick={() => setIsEmailEditable(!isEmailEditable)}
                  className="text-sm text-[#F26E52]"
                >
                  {isEmailEditable ? 'Cancel' : 'Change Email?'}
                </button>
              </div>
              {isEmailEditable && (
                <div className="mt-2 space-y-2">
                  <input
                    type="email"
                    placeholder="New Email"
                    value={newEmail ?? ''}
                    onChange={(e) => setNewEmail(e.target.value || '')}
                    className="w-full h-10 px-4 border text-gray-600 rounded-lg focus:outline-none focus:border-[#F26E52]"
                    disabled={isLoading}
                  />
                  <input
                    type="text"
                    placeholder="Enter OTP"
                    value={otp ?? ''}
                    onChange={(e) => setOtp(e.target.value || '')}
                    className="w-full h-10 px-4 border text-gray-600 rounded-lg focus:outline-none focus:border-[#F26E52]"
                    disabled={isLoading}
                  />
                  <div className="flex space-x-2">
                    <button
                      onClick={handleRequestOtp}
                      disabled={isLoading}
                      className="h-10 px-4 border border-[#F26E52] text-[#F26E52] rounded-lg text-sm flex items-center justify-center disabled:opacity-50"
                    >
                      {isLoading && (
                        <Image src="/loader.gif" alt="Loading" width={16} height={16} className="mr-2 animate-spin" />
                      )}
                      Request OTP
                    </button>
                    <button
                      onClick={handleEmailSave}
                      disabled={isLoading || !newEmail || !otp}
                      className="h-10 px-4 bg-[#F26E52] text-white rounded-lg text-sm flex items-center justify-center disabled:opacity-50"
                    >
                      {isLoading && (
                        <Image src="/loader.gif" alt="Loading" width={16} height={16} className="mr-2 animate-spin" />
                      )}
                      Save Email
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <label htmlFor="password" className="text-sm text-gray-600 text-left block">
                Password
              </label>
              <div className="flex items-center space-x-2">
                <input
                  id="password"
                  type="password"
                  value={userDetails.password}
                  disabled
                  className="w-full h-10 px-4 border text-gray-600 rounded-lg bg-gray-100"
                />
                <button
                  onClick={() => setIsPasswordEditable(!isPasswordEditable)}
                  className="text-sm text-[#F26E52]"
                >
                  {isPasswordEditable ? 'Cancel' : 'Change Password?'}
                </button>
              </div>
              {isPasswordEditable && (
                <div className="mt-2 space-y-2">
                  <input
                    type="password"
                    placeholder="Current Password"
                    value={currentPassword ?? ''}
                    onChange={(e) => setCurrentPassword(e.target.value || '')}
                    className="w-full h-10 px-4 border text-gray-600 rounded-lg focus:outline-none focus:border-[#F26E52]"
                    disabled={isLoading}
                  />
                  <input
                    type="password"
                    placeholder="New Password"
                    value={newPassword ?? ''}
                    onChange={(e) => setNewPassword(e.target.value || '')}
                    className="w-full h-10 px-4 border text-gray-600 rounded-lg focus:outline-none focus:border-[#F26E52]"
                    disabled={isLoading}
                  />
                  <button
                    onClick={handlePasswordSave}
                    disabled={isLoading || !currentPassword || !newPassword}
                    className="h-10 px-4 bg-[#F26E52] text-white rounded-lg text-sm flex items-center justify-center disabled:opacity-50"
                  >
                    {isLoading && (
                      <Image src="/loader.gif" alt="Loading" width={16} height={16} className="mr-2 animate-spin" />
                    )}
                    Save Password
                  </button>
                </div>
              )}
            </div>
          </div>

          {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

          <div className="flex justify-between items-center p-4 bg-white rounded-lg shadow-md mb-4">
            <div className="flex items-center space-x-2">
              <p className="text-sm text-[#011631]">Two Factor Authentication</p>
              <Image src="/info.png" alt="Info" width={16} height={16} />
            </div>
            <div className="flex items-center space-x-2">
              <p className="text-sm text-gray-600">{userDetails.twoFactorAuth ? 'Enabled' : 'Disabled'}</p>
              <button
                onClick={() => handleToggleAuth('twoFactorAuth')}
                disabled={isLoading}
                className={`w-10 h-5 rounded-full flex items-center p-1 ${
                  userDetails.twoFactorAuth ? 'bg-[#F26E52]' : 'bg-gray-300'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transform transition-transform ${
                    userDetails.twoFactorAuth ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="flex justify-between items-center p-4 bg-white rounded-lg shadow-md mb-4">
            <div className="flex items-center space-x-2">
              <p className="text-sm text-[#011631]">Ask to Change Password Every 6 Months</p>
              <Image src="/info.png" alt="Info" width={16} height={16} />
            </div>
            <div className="flex items-center space-x-2">
              <p className="text-sm text-gray-600">{userDetails.askPasswordChange ? 'Enabled' : 'Disabled'}</p>
              <button
                onClick={() => handleToggleAuth('askPasswordChange')}
                disabled={isLoading}
                className={`w-10 h-5 rounded-full flex items-center p-1 ${
                  userDetails.askPasswordChange ? 'bg-[#F26E52]' : 'bg-gray-300'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transform transition-transform ${
                    userDetails.askPasswordChange ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="p-4 bg-white rounded-lg shadow-md">
            <p className="text-sm text-gray-600">
              We do our best to give you a great experience, we will be sad to see you leave.
            </p>
            <button className="text-sm text-[#F26E52] mt-2">Delete Account?</button>
          </div>
        </div>
      )}

      {activeTab === 'Alert Configuration' && (
        <div>
          <h2 className="text-xl font-bold text-[#011631] mb-6">Alert Configuration</h2>
          <div className="w-2/3">
            <div className="flex justify-between p-4 bg-[#FFF1EE] rounded-t-lg">
              <p className="text-sm font-semibold text-gray-600">Alert Topics</p>
              <p className="text-sm font-semibold text-gray-600">On/Off</p>
            </div>
            <div className="space-y-4 bg-white rounded-b-lg shadow-md">
              {alertSettings.map((alert, index) => (
                <div
                  key={index}
                  className="flex justify-between items-center p-4 border-b border-gray-200 last:border-b-0"
                >
                  <p className="text-sm text-[#011631]">{alert.topic}</p>
                  <div className="flex items-center space-x-2">
                    <p className="text-sm text-gray-600">{alert.enabled ? 'On' : 'Off'}</p>
                    <button
                      onClick={() => handleToggleAlert(index)}
                      disabled={isLoading}
                      className={`w-10 h-5 rounded-full flex items-center p-1 ${
                        alert.enabled ? 'bg-[#F26E52]' : 'bg-gray-300'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full bg-white transform transition-transform ${
                          alert.enabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}