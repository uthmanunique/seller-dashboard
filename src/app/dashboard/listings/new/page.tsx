// src/app/dashboard/listings/new/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { toast } from 'react-toastify';
import Loader from '@/src/components/Loader';
import Cookies from 'js-cookie';
import api from '@/src/lib/api';
import { AxiosError } from 'axios';

interface SellerData {
  id: string;
  role: string;
  email: string;
  firstName?: string;
  lastName?: string;
  profilePicture?: string;
}

interface ApiErrorResponse {
  message: string;
  error?: string;
  statusCode?: number;
}

interface Listing {
  id: string;
  role: string;
  entityType: string;
  businessName: string;
  cacRegistrationNumber: string;
  businessCategoryType: string;
  location: string;
  yearEstablished: string;
  reasonForSelling: string;
  annualRevenueRange: string;
  price: number;
  isNegotiable: boolean;
  companyProfileUrl: string | null;
  cacDocumentUrl: string | null;
  memorandumAndArticlesUrl: string | null;
  shareAllotmentFormUrl: string | null;
  letterOfAuthorizationUrl: string | null;
  numberOfEmployees: string;
  assetsAndInventory: string[];
  debtAndLiabilities: string[];
  preferredBuyerType: string;
  isPremiumSale: boolean;
  businessImagesUrl: string[];
}

interface UserData {
  name: string;
  email: string;
  profilePicture: string;
}

interface FormData {
  role: string;
  entityType: string;
  businessName: string;
  cacRegistrationNumber: string;
  businessCategoryType: string;
  location: string;
  yearEstablished: string;
  reasonForSelling: string;
  annualRevenueRange: string;
  price: string;
  isNegotiable: string;
  companyProfileUrl: File | string | null;
  cacDocuments: File | string | null;
  memorandum: File | string | null;
  shareAllotment: File | string | null;
  letterOfAuthorization: File | string | null;
  numberOfEmployees: string;
  assetsAndInventory: string[];
  debtAndLiabilities: string[];
  preferredBuyerType: string;
  listingType: string;
  images: (File | string)[];
  sellerId: string;
}

export default function AddListingClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const listingId = searchParams.get('listingId');
  const [isEditMode, setIsEditMode] = useState(false);
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [user, setUser] = useState<UserData>({ name: '', email: '', profilePicture: '/profile.png' });
  const [formData, setFormData] = useState<FormData>({
    role: 'Owner',
    entityType: '',
    businessName: '',
    cacRegistrationNumber: '',
    businessCategoryType: '',
    location: '',
    yearEstablished: '',
    reasonForSelling: '',
    annualRevenueRange: '',
    price: '',
    isNegotiable: '',
    companyProfileUrl: null,
    cacDocuments: null,
    memorandum: null,
    shareAllotment: null,
    letterOfAuthorization: null,
    numberOfEmployees: '',
    assetsAndInventory: [],
    debtAndLiabilities: [],
    preferredBuyerType: '',
    listingType: '',
    images: [],
    sellerId: '',
  });

  useEffect(() => {
    const initializeUser = () => {
      const accessToken = Cookies.get('accessToken');
      const sellerDataString = Cookies.get('sellerData');
    
      if (!accessToken || !sellerDataString) {
        router.push('/auth/login?role=seller');
        return;
      }
    
      try {
        const sellerData: SellerData = JSON.parse(sellerDataString);
        if (!sellerData.id) {
          toast.error('Invalid session data. Please log in again.');
          router.push('/auth/login?role=seller');
          return;
        }
    
        setFormData((prev) => ({ ...prev, sellerId: sellerData.id }));
        setUser({
          name: `${sellerData.firstName || ''} ${sellerData.lastName || ''}`.trim() || 'User',
          email: sellerData.email || '',
          profilePicture: sellerData.profilePicture || '/profile.png', // Changed from profileImage
        });
    
        if (listingId) {
          fetchListing(sellerData.id, accessToken);
        }
      } catch (err) {
        console.error('Error parsing seller data:', err);
        router.push('/auth/login?role=seller');
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const fetchListing = async (sellerId: string, accessToken: string) => {
      try {
        const response = await api.get(`/seller/listings/fetch-all/${sellerId}`);
        const listings: Listing[] = response.data.listings; // Adjust based on actual response structure
        const listing = listings.find((l) => l.id === listingId);
        if (listing) {
          setFormData({
            role: listing.role || 'Owner',
            entityType: listing.entityType || '',
            businessName: listing.businessName || '',
            cacRegistrationNumber: listing.cacRegistrationNumber || '',
            businessCategoryType: listing.businessCategoryType || '',
            location: listing.location || '',
            yearEstablished: listing.yearEstablished || '',
            reasonForSelling: listing.reasonForSelling || '',
            annualRevenueRange: listing.annualRevenueRange || '',
            price: listing.price ? listing.price.toString() : '',
            isNegotiable: listing.isNegotiable ? 'Yes' : 'No',
            companyProfileUrl: listing.companyProfileUrl || null,
            cacDocuments: listing.cacDocumentUrl || null,
            memorandum: listing.memorandumAndArticlesUrl || null,
            shareAllotment: listing.shareAllotmentFormUrl || null,
            letterOfAuthorization: listing.letterOfAuthorizationUrl || null,
            numberOfEmployees: listing.numberOfEmployees || '',
            assetsAndInventory: listing.assetsAndInventory || [],
            debtAndLiabilities: listing.debtAndLiabilities || [],
            preferredBuyerType: listing.preferredBuyerType || '',
            listingType: listing.isPremiumSale ? 'Rebrivo Premium' : 'Standard Listing',
            images: listing.businessImagesUrl || [],
            sellerId: sellerId,
          });
          setIsEditMode(true);
        } else {
          toast.error('Listing not found in seller’s listings.');
          setIsEditMode(false);
        }
      } catch (err) {
        console.error('Error fetching listing:', err);
        const axiosError = err as AxiosError;
        if (axiosError.response?.status === 404) {
          toast.error('Fetch endpoint not found on server.');
        } else {
          toast.error('Failed to load listing data.');
        }
        setIsEditMode(false);
      }
    };

    initializeUser();
  }, [listingId, router]);

  const handleSubmit = async () => {
    if (!isFormComplete()) {
      toast.error('Please fill all required fields.');
      return;
    }

    const accessToken = Cookies.get('accessToken');
    const sellerDataString = Cookies.get('sellerData');

    if (!accessToken || !sellerDataString) {
      toast.error('Please log in to submit a listing.');
      router.push('/auth/login?role=seller');
      return;
    }

    let sellerData: SellerData;
    try {
      sellerData = JSON.parse(sellerDataString);
    } catch (err) {
      console.error('Error parsing seller data:', err);
      toast.error('Invalid session data. Please log in again.');
      router.push('/auth/login?role=seller');
      return;
    }

    setIsSubmitting(true);

    try {
      const config = {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
        timeout: 60000,
      };

      let response;
      if (isEditMode) {
        const updateData = {
          businessName: formData.businessName,
          businessCategoryType: formData.businessCategoryType,
          entityType: formData.entityType,
          location: formData.location,
          yearEstablished: formData.yearEstablished,
          reasonForSelling: formData.reasonForSelling,
          annualRevenueRange: formData.annualRevenueRange,
          price: parseFloat(formData.price),
          isNegotiable: formData.isNegotiable === 'Yes',
          isPremiumSale: formData.listingType === 'Rebrivo Premium',
        };
        response = await api.patch(
          `/seller/listings/update-listing/${listingId}`,
          updateData,
          { ...config, headers: { ...config.headers, 'Content-Type': 'application/json' } }
        );
      } else {
        const formDataToSend = new FormData();
        formDataToSend.append('businessCategoryType', formData.businessCategoryType);
        formDataToSend.append('cacRegistrationNumber', formData.cacRegistrationNumber);
        formDataToSend.append('location', formData.location);
        formDataToSend.append('yearEstablished', formData.yearEstablished);
        formDataToSend.append('reasonForSelling', formData.reasonForSelling);
        formDataToSend.append('isPremiumSale', formData.listingType === 'Rebrivo Premium' ? 'true' : 'false');
        formDataToSend.append('annualRevenueRange', formData.annualRevenueRange);
        formDataToSend.append('price', formData.price);
        formDataToSend.append('isNegotiable', formData.isNegotiable === 'Yes' ? 'true' : 'false');
        formDataToSend.append('role', formData.role);
        formDataToSend.append('businessName', formData.businessName);
        formDataToSend.append('entityType', formData.entityType);
        formDataToSend.append('sellerId', sellerData.id);
        formDataToSend.append('numberOfEmployees', formData.numberOfEmployees || '');
        formDataToSend.append('preferredBuyerType', formData.preferredBuyerType);
        formDataToSend.append('assetsAndInventory', JSON.stringify(formData.assetsAndInventory));
        formDataToSend.append('debtAndLiabilities', JSON.stringify(formData.debtAndLiabilities));

        if (formData.companyProfileUrl instanceof File) {
          formDataToSend.append('companyProfileUrl', formData.companyProfileUrl);
        }
        if (formData.cacDocuments instanceof File) {
          formDataToSend.append('cacDocumentUrl', formData.cacDocuments);
        }
        if (formData.memorandum instanceof File) {
          formDataToSend.append('memorandumAndArticlesUrl', formData.memorandum);
        }
        if (formData.shareAllotment instanceof File) {
          formDataToSend.append('shareAllotmentFormUrl', formData.shareAllotment);
        }
        if (formData.role === 'Broker' && formData.letterOfAuthorization instanceof File) {
          formDataToSend.append('letterOfAuthorizationUrl', formData.letterOfAuthorization);
        }
        formData.images.forEach((file) => {
          if (file instanceof File) {
            formDataToSend.append('businessImagesUrl', file);
          }
        });

        response = await api.post('/seller/listings/add', formDataToSend, {
          ...config,
          headers: { ...config.headers, 'Content-Type': 'multipart/form-data' },
        });
      }

      if (response.status === 201 || response.status === 200) {
        toast.success(isEditMode ? 'Listing updated successfully!' : 'Listing sent for review successfully!');
        router.push('/dashboard/listings');
      }
    } catch (error) {
      console.error('Raw error:', error);
      const axiosError = error as AxiosError<ApiErrorResponse>;
      if (axiosError.response?.status === 404) {
        toast.error(`API endpoint not found. Please check server configuration.`);
      } else {
        const errorMessage = axiosError.response?.data?.message || 'Bad Request - check console';
        toast.error(`Failed to ${isEditMode ? 'update' : 'submit'} listing: ${errorMessage}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormComplete = () => {
    const requiredFields = [
      formData.role,
      formData.entityType,
      formData.businessName,
      formData.cacRegistrationNumber,
      formData.businessCategoryType,
      formData.location,
      formData.yearEstablished,
      formData.reasonForSelling,
      formData.annualRevenueRange,
      formData.price,
      formData.isNegotiable,
      formData.preferredBuyerType,
      formData.listingType,
    ];
    if (!isEditMode) {
      if (formData.companyProfileUrl) requiredFields.push(formData.companyProfileUrl as string);
      if (formData.cacDocuments) requiredFields.push(formData.cacDocuments as string);
      if (formData.memorandum) requiredFields.push(formData.memorandum as string);
      if (formData.shareAllotment) requiredFields.push(formData.shareAllotment as string);
      if (formData.role === 'Broker' && formData.letterOfAuthorization) requiredFields.push(formData.letterOfAuthorization as string);
    }
    return requiredFields.every((field) => field !== '' && field !== null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: keyof FormData) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = field === 'images' ? Array.from(e.target.files) : e.target.files[0];
      setFormData((prev) => ({
        ...prev,
        [field]: field === 'images' ? [...prev.images, ...(files as File[])] : files,
      }));
    }
  };

  const handleAddToArray = (field: 'assetsAndInventory' | 'debtAndLiabilities', value: string) => {
    if (value.trim()) {
      setFormData((prev) => ({
        ...prev,
        [field]: [...prev[field], value.trim()],
      }));
    }
  };

  const handleNext = () => {
    if (step < 3) setStep(step + 1);
  };

  const handlePrevious = () => {
    if (step > 1) setStep(step - 1);
  };

  const getFileIcon = (file: File | string) => {
    if (typeof file === 'string') return file;
    const extension = file.name.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf': return '/pdf.png';
      case 'jpg': case 'jpeg': case 'png': return '/document.png';
      case 'xlsx': return '/xlsx.png';
      case 'docx': case 'doc': return '/docx.png';
      default: return '/document.png';
    }
  };

  return (
    <div className="flex">
      <div className="hidden md:block w-64 p-4 bg-white border-r border-gray-200">
  <div className="flex flex-col items-center">
    <Image
      src={user.profilePicture}
      alt="Profile"
      width={80}
      height={80}
      className="rounded-full mb-2"
    />
    <h3 className="text-sm font-semibold text-[#011631]">{user.name}</h3>
    <div className="flex items-center space-x-1 mt-1">
      <Image src="/message.png" alt="Email" width={12} height={12} />
      <p className="text-xs text-gray-600">{user.email}</p>
    </div>
    {user.profilePicture === '/profile.png' && (
      <Link href="/dashboard/settings" className="text-xs text-[#F26E52] mt-2">
        Please add your Profile
      </Link>
    )}
  </div>
</div>

      <div className="flex-1 p-4 overflow-y-auto h-[calc(100vh-72px)]">
        <div className="flex items-center justify-center mb-6">
          <div className="flex-1 max-w-md flex items-center space-x-2">
            <div className={`h-2 flex-1 rounded-full ${step >= 1 ? 'bg-[#F26E52]' : 'bg-gray-300'}`}></div>
            <div className={`h-2 flex-1 rounded-full ${step >= 2 ? 'bg-[#F26E52]' : 'bg-gray-300'}`}></div>
            <div className={`h-2 flex-1 rounded-full ${step >= 3 ? 'bg-[#F26E52]' : 'bg-gray-300'}`}></div>
          </div>
          <p className="text-xs text-gray-600 ml-4">Step {step}/3</p>
        </div>

        {step === 1 && (
          <div className="flex-1 max-w-2xl mx-auto items-center justify-center">
            <h2 className="text-xl font-bold text-[#011631] mb-2">{isEditMode ? 'Edit Your Business' : 'Tell Us About Your Business'}</h2>
            <div className="flex items-center text-xs text-red-600 mb-2">
              <p>All fields marked with <span className="text-red-600">*</span> are required.</p>
            </div>
            <p className="text-xs text-gray-600 mb-6">Provide basic details to help buyers understand your business.</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700">Role <span className="text-red-600">*</span></label>
                <div className="flex space-x-4 mt-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="role"
                      value="Owner"
                      checked={formData.role === 'Owner'}
                      onChange={handleInputChange}
                      className="mr-2"
                      disabled={isEditMode}
                    />
                    <span className="text-xs text-black">Owner</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="role"
                      value="Broker"
                      checked={formData.role === 'Broker'}
                      onChange={handleInputChange}
                      className="mr-2"
                      disabled={isEditMode}
                    />
                    <span className="text-xs text-black">Broker</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700">Entity Type <span className="text-red-600">*</span></label>
                <div className="relative mt-2">
                  <select
                    name="entityType"
                    value={formData.entityType}
                    onChange={handleInputChange}
                    className="w-full h-10 px-4 border text-gray-600 rounded-lg focus:outline-none focus:border-[#F26E52] appearance-none"
                    disabled={isEditMode}
                  >
                    <option value="">Select one</option>
                    <option value="Sole Proprietorship">Sole Proprietorship</option>
                    <option value="Partnership">Partnership</option>
                    <option value="Limited Liability Company">Limited Liability Company</option>
                  </select>
                  <Image
                    src="/dropdown.png"
                    alt="Dropdown"
                    width={16}
                    height={16}
                    className="absolute right-3 top-3 pointer-events-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700">Business Name <span className="text-red-600">*</span></label>
                <input
                  type="text"
                  name="businessName"
                  value={formData.businessName}
                  onChange={handleInputChange}
                  placeholder="Enter business name"
                  className="w-full h-10 px-4 border text-gray-600 rounded-lg focus:outline-none focus:border-[#F26E52] mt-2"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700">CAC Registration Number <span className="text-red-600">*</span></label>
                <input
                  type="text"
                  name="cacRegistrationNumber"
                  value={formData.cacRegistrationNumber}
                  onChange={handleInputChange}
                  placeholder="Enter CAC number"
                  className="w-full h-10 px-4 border text-gray-600 rounded-lg focus:outline-none focus:border-[#F26E52] mt-2"
                  readOnly={isEditMode}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700">Business Category <span className="text-red-600">*</span></label>
                <div className="relative mt-2">
                  <select
                    name="businessCategoryType"
                    value={formData.businessCategoryType}
                    onChange={handleInputChange}
                    className="w-full h-10 px-4 border text-gray-600 rounded-lg focus:outline-none focus:border-[#F26E52] appearance-none"
                  >
                    <option value="">Select one</option>
                    <option value="Agriculture">Agriculture</option>
                    <option value="Fintech">Fintech</option>
                    <option value="Healthcare">Healthcare</option>
                    <option value="Retail">Retail</option>
                    <option value="Manufacturing">Manufacturing</option>
                    <option value="ICT">ICT</option>
                  </select>
                  <Image
                    src="/dropdown.png"
                    alt="Dropdown"
                    width={16}
                    height={16}
                    className="absolute right-3 top-3 pointer-events-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700">Location <span className="text-red-600">*</span></label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  placeholder="Enter city & state"
                  className="w-full h-10 px-4 border text-gray-600 rounded-lg focus:outline-none focus:border-[#F26E52] mt-2"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700">Year Established <span className="text-red-600">*</span></label>
                <input
                  type="number"
                  name="yearEstablished"
                  value={formData.yearEstablished}
                  onChange={handleInputChange}
                  placeholder="Enter year"
                  className="w-full h-10 px-4 border text-gray-600 rounded-lg focus:outline-none focus:border-[#F26E52] mt-2"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700">Reason for Selling <span className="text-red-600">*</span></label>
                <div className="relative mt-2">
                  <select
                    name="reasonForSelling"
                    value={formData.reasonForSelling}
                    onChange={handleInputChange}
                    className="w-full h-10 px-4 border text-gray-600 rounded-lg focus:outline-none focus:border-[#F26E52] appearance-none"
                  >
                    <option value="">Select one</option>
                    <option value="Need for cash">Need for cash</option>
                    <option value="Exiting the industry">Exiting the industry</option>
                    <option value="Business restructuring">Business restructuring</option>
                    <option value="Relocation">Relocation</option>
                    <option value="Seeking investment for other ventures">Seeking investment for other ventures</option>
                    <option value="Financial challenges">Financial challenges</option>
                  </select>
                  <Image
                    src="/dropdown.png"
                    alt="Dropdown"
                    width={16}
                    height={16}
                    className="absolute right-3 top-3 pointer-events-none"
                  />
                </div>
              </div>
              {!isEditMode && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700">Upload Business Images</label>
                  <p className="text-xs text-gray-600 mb-2">Add high-quality images to showcase your business to potential buyers.</p>
                  <div
                    className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const files = Array.from(e.dataTransfer.files);
                      setFormData({ ...formData, images: [...formData.images, ...files] });
                    }}
                  >
                    <input
                      type="file"
                      multiple
                      accept=".jpg,.png,.pdf,.xlsx,.docx"
                      onChange={(e) => handleFileChange(e, 'images')}
                      className="hidden"
                      id="business-images"
                    />
                    <label htmlFor="business-images" className="cursor-pointer flex flex-col items-center">
                      {formData.images.length > 0 ? (
                        <Image src={getFileIcon(formData.images[0])} alt="Preview" width={40} height={40} />
                      ) : (
                        <Image src="/document.png" alt="Upload" width={40} height={40} />
                      )}
                      <p className="text-xs text-gray-600 mt-2">Drag and Drop file here or choose file</p>
                    </label>
                    {formData.images.length > 0 && (
                      <ul className="mt-2 text-xs text-gray-600">
                        {formData.images.map((file, index) => (
                          <li key={index}>{file instanceof File ? file.name : file}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="flex justify-between text-xs text-gray-600 mt-2">
                    <p>Supported formats: jpg, png, pdf, xlsx, docx</p>
                    <p>Maximum: 2MB</p>
                  </div>
                </div>
              )}
              <div className="flex justify-end">
                <button
                  onClick={handleNext}
                  className="h-12 rounded-lg bg-[#F26E52] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#e65a3e]"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="max-w-2xl mx-auto">
            <h2 className="text-xl font-bold text-[#011631] mb-2">Add Key Financials & Documents</h2>
            <p className="text-xs text-gray-600 mb-2">Improve credibility by sharing financial details and supporting documents.</p>
            <div className="flex items-center text-xs text-red-600 mb-6">
              <p>All fields marked with <span className="text-red-600">*</span> are required.</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700">Annual Revenue Range <span className="text-red-600">*</span></label>
                <div className="relative mt-2">
                  <select
                    name="annualRevenueRange"
                    value={formData.annualRevenueRange}
                    onChange={handleInputChange}
                    className="w-full h-10 px-4 border text-gray-600 rounded-lg focus:outline-none focus:border-[#F26E52] appearance-none"
                  >
                    <option value="">Select range</option>
                    <option value="₦0 - ₦1M">₦0 - ₦1M</option>
                    <option value="₦1M - ₦5M">₦1M - ₦5M</option>
                    <option value="₦5M - ₦10M">₦5M - ₦10M</option>
                    <option value="₦10M - ₦50M">₦10M - ₦50M</option>
                    <option value="₦50M - ₦100M">₦50M - ₦100M</option>
                    <option value="₦100M - ₦200M">₦100M - ₦200M</option>
                    <option value="₦350M - ₦400M">₦350M - ₦400M</option>
                    <option value="Above ₦400M">Above ₦400M</option>
                  </select>
                  <Image
                    src="/dropdown.png"
                    alt="Dropdown"
                    width={16}
                    height={16}
                    className="absolute right-3 top-3 pointer-events-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700">Price <span className="text-red-600">*</span></label>
                <input
                  type="text"
                  name="price"
                  value={formData.price}
                  onChange={handleInputChange}
                  placeholder="Enter asking price"
                  className="w-full h-10 px-4 border text-gray-600 rounded-lg focus:outline-none focus:border-[#F26E52] mt-2"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700">Are you Open to Negotiation? <span className="text-red-600">*</span></label>
                <div className="flex space-x-4 mt-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="isNegotiable"
                      value="Yes"
                      checked={formData.isNegotiable === 'Yes'}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-xs text-black">Yes</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="isNegotiable"
                      value="No"
                      checked={formData.isNegotiable === 'No'}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-xs text-black">No</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700">Number of Employees</label>
                <div className="relative mt-2">
                  <select
                    name="numberOfEmployees"
                    value={formData.numberOfEmployees}
                    onChange={handleInputChange}
                    className="w-full h-10 px-4 border text-gray-600 rounded-lg focus:outline-none focus:border-[#F26E52] appearance-none"
                    disabled={isEditMode}
                  >
                    <option value="">Select range</option>
                    <option value="1 to 10">1 to 10</option>
                    <option value="11 to 20">11 to 20</option>
                    <option value="21 to 50">21 to 50</option>
                    <option value="51 to 100">51 to 100</option>
                    <option value="101 to 200">101 to 200</option>
                    <option value="Above 200">Above 200</option>
                  </select>
                  <Image
                    src="/dropdown.png"
                    alt="Dropdown"
                    width={16}
                    height={16}
                    className="absolute right-3 top-3 pointer-events-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700">Preferred Buyer Type <span className="text-red-600">*</span></label>
                <div className="relative mt-2">
                  <select
                    name="preferredBuyerType"
                    value={formData.preferredBuyerType}
                    onChange={handleInputChange}
                    className="w-full h-10 px-4 border text-gray-600 rounded-lg focus:outline-none focus:border-[#F26E52] appearance-none"
                    disabled={isEditMode}
                  >
                    <option value="">Select one</option>
                    <option value="Individual Entrepreneur">Individual Entrepreneur</option>
                    <option value="Corporate Buyer">Corporate Buyer</option>
                    <option value="Private Equity Firm">Private Equity Firm</option>
                    <option value="Industry-Specific Buyer">Industry-Specific Buyer</option>
                  </select>
                  <Image
                    src="/dropdown.png"
                    alt="Dropdown"
                    width={16}
                    height={16}
                    className="absolute right-3 top-3 pointer-events-none"
                  />
                </div>
              </div>
              {!isEditMode && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700">Assets & Inventory</label>
                    <div className="mt-2">
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          id="assetsInput"
                          placeholder="Enter asset or inventory item"
                          className="w-full h-10 px-4 border text-gray-600 rounded-lg focus:outline-none focus:border-[#F26E52]"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleAddToArray('assetsAndInventory', e.currentTarget.value);
                              e.currentTarget.value = '';
                            }
                          }}
                        />
                        <button
                          onClick={() => {
                            const input = document.getElementById('assetsInput') as HTMLInputElement;
                            handleAddToArray('assetsAndInventory', input.value);
                            input.value = '';
                          }}
                          className="bg-[#F26E52] text-white px-4 py-2 rounded-md text-sm"
                        >
                          Add
                        </button>
                      </div>
                      {formData.assetsAndInventory.length > 0 && (
                        <ul className="mt-2 space-y-1">
                          {formData.assetsAndInventory.map((item, index) => (
                            <li key={index} className="text-xs text-gray-600 bg-gray-100 p-2 rounded">
                              {item}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700">Debt & Liabilities</label>
                    <div className="mt-2">
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          id="debtsInput"
                          placeholder="Enter debt or liability"
                          className="w-full h-10 px-4 border text-gray-600 rounded-lg focus:outline-none focus:border-[#F26E52]"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleAddToArray('debtAndLiabilities', e.currentTarget.value);
                              e.currentTarget.value = '';
                            }
                          }}
                        />
                        <button
                          onClick={() => {
                            const input = document.getElementById('debtsInput') as HTMLInputElement;
                            handleAddToArray('debtAndLiabilities', input.value);
                            input.value = '';
                          }}
                          className="bg-[#F26E52] text-white px-4 py-2 rounded-md text-sm"
                        >
                          Add
                        </button>
                      </div>
                      {formData.debtAndLiabilities.length > 0 && (
                        <ul className="mt-2 space-y-1">
                          {formData.debtAndLiabilities.map((item, index) => (
                            <li key={index} className="text-xs text-gray-600 bg-gray-100 p-2 rounded">
                              {item}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                  {formData.role === 'Broker' && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700">
                        Letter of Authorization <span className="text-red-600">*</span>
                      </label>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center mt-2">
                        <input
                          type="file"
                          accept=".png,.jpg,.jpeg,.docs,.docx"
                          onChange={(e) => handleFileChange(e, 'letterOfAuthorization')}
                          className="hidden"
                          id="letter-of-authorization"
                        />
                        <label htmlFor="letter-of-authorization" className="cursor-pointer flex flex-col items-center">
                          {formData.letterOfAuthorization ? (
                            <Image
                              src={getFileIcon(formData.letterOfAuthorization as File | string)}
                              alt="Preview"
                              width={40}
                              height={40}
                            />
                          ) : (
                            <Image src="/document.png" alt="Upload" width={40} height={40} />
                          )}
                          <p className="text-xs text-gray-600 mt-2">Drag and Drop file here or choose file</p>
                        </label>
                        {formData.letterOfAuthorization && (
                          <p className="text-xs text-gray-600 mt-2">
                            {formData.letterOfAuthorization instanceof File
                              ? formData.letterOfAuthorization.name
                              : formData.letterOfAuthorization}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700">Company Profile <span className="text-red-600">*</span></label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center mt-2">
                      <input
                        type="file"
                        accept=".png,.jpg,.jpeg,.docs,.docx"
                        onChange={(e) => handleFileChange(e, 'companyProfileUrl')}
                        className="hidden"
                        id="company-profile"
                      />
                      <label htmlFor="company-profile" className="cursor-pointer flex flex-col items-center">
                        {formData.companyProfileUrl ? (
                          <Image
                            src={getFileIcon(formData.companyProfileUrl as File | string)}
                            alt="Preview"
                            width={40}
                            height={40}
                          />
                        ) : (
                          <Image src="/document.png" alt="Upload" width={40} height={40} />
                        )}
                        <p className="text-xs text-gray-600 mt-2">Drag and Drop file here or choose file</p>
                      </label>
                      {formData.companyProfileUrl && (
                        <p className="text-xs text-gray-600 mt-2">
                          {formData.companyProfileUrl instanceof File ? formData.companyProfileUrl.name : formData.companyProfileUrl}
                        </p>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700">Upload CAC Documents <span className="text-red-600">*</span></label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center mt-2">
                      <input
                        type="file"
                        accept=".png,.jpg,.jpeg,.docs,.docx"
                        onChange={(e) => handleFileChange(e, 'cacDocuments')}
                        className="hidden"
                        id="cac-documents"
                      />
                      <label htmlFor="cac-documents" className="cursor-pointer flex flex-col items-center">
                        {formData.cacDocuments ? (
                          <Image
                            src={getFileIcon(formData.cacDocuments as File | string)}
                            alt="Preview"
                            width={40}
                            height={40}
                          />
                        ) : (
                          <Image src="/document.png" alt="Upload" width={40} height={40} />
                        )}
                        <p className="text-xs text-gray-600 mt-2">Drag and Drop file here or choose file</p>
                      </label>
                      {formData.cacDocuments && (
                        <p className="text-xs text-gray-600 mt-2">
                          {formData.cacDocuments instanceof File ? formData.cacDocuments.name : formData.cacDocuments}
                        </p>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700">Upload Memorandum & Articles of Information <span className="text-red-600">*</span></label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center mt-2">
                      <input
                        type="file"
                        accept=".png,.jpg,.jpeg,.docs,.docx"
                        onChange={(e) => handleFileChange(e, 'memorandum')}
                        className="hidden"
                        id="memorandum"
                      />
                      <label htmlFor="memorandum" className="cursor-pointer flex flex-col items-center">
                        {formData.memorandum ? (
                          <Image
                            src={getFileIcon(formData.memorandum as File | string)}
                            alt="Preview"
                            width={40}
                            height={40}
                          />
                        ) : (
                          <Image src="/document.png" alt="Upload" width={40} height={40} />
                        )}
                        <p className="text-xs text-gray-600 mt-2">Drag and Drop file here or choose file</p>
                      </label>
                      {formData.memorandum && (
                        <p className="text-xs text-gray-600 mt-2">
                          {formData.memorandum instanceof File ? formData.memorandum.name : formData.memorandum}
                        </p>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700">Upload Share Allotment Form <span className="text-red-600">*</span></label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center mt-2">
                      <input
                        type="file"
                        accept=".png,.jpg,.jpeg,.docs,.docx"
                        onChange={(e) => handleFileChange(e, 'shareAllotment')}
                        className="hidden"
                        id="share-allotment"
                      />
                      <label htmlFor="share-allotment" className="cursor-pointer flex flex-col items-center">
                        {formData.shareAllotment ? (
                          <Image
                            src={getFileIcon(formData.shareAllotment as File | string)}
                            alt="Preview"
                            width={40}
                            height={40}
                          />
                        ) : (
                          <Image src="/document.png" alt="Upload" width={40} height={40} />
                        )}
                        <p className="text-xs text-gray-600 mt-2">Drag and Drop file here or choose file</p>
                      </label>
                      {formData.shareAllotment && (
                        <p className="text-xs text-gray-600 mt-2">
                          {formData.shareAllotment instanceof File ? formData.shareAllotment.name : formData.shareAllotment}
                        </p>
                      )}
                    </div>
                  </div>
                </>
              )}
              <div className="flex justify-between">
                <button
                  onClick={handlePrevious}
                  className="border border-[#F26E52] text-[#F26E52] px-6 py-2 rounded-md text-sm w-32 flex items-center justify-center"
                >
                  Previous
                </button>
                <button
                  onClick={handleNext}
                  className="bg-[#F26E52] text-white px-6 py-2 rounded-md text-sm w-32 flex items-center justify-center"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="max-w-2xl mx-auto">
            <h2 className="text-xl font-bold text-[#011631] mb-2">{isEditMode ? 'Review & Update' : 'Final Check & Go Live'}</h2>
            <p className="text-xs text-gray-600 mb-6">{isEditMode ? 'Review and update your listing.' : 'Review your details and publish when ready.'}</p>
            <div className="bg-white p-6 rounded-md shadow-sm space-y-4">
              <div>
                <p className="text-sm font-semibold text-gray-700">Role</p>
                <p className="text-xs text-gray-600">{formData.role}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700">Entity Type</p>
                <p className="text-xs text-gray-600">{formData.entityType}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700">Business Name</p>
                <p className="text-xs text-gray-600">{formData.businessName}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700">CAC Registration Number</p>
                <p className="text-xs text-gray-600">{formData.cacRegistrationNumber}</p>
              </div>
              <div className="flex space-x-4">
                <div>
                  <p className="text-sm font-semibold text-gray-700">Category</p>
                  <p className="text-xs text-gray-600">{formData.businessCategoryType}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-700">Location</p>
                  <p className="text-xs text-gray-600">{formData.location}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-700">Year Established</p>
                  <p className="text-xs text-gray-600">{formData.yearEstablished}</p>
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700">Reason for Selling</p>
                <p className="text-xs text-gray-600">{formData.reasonForSelling}</p>
              </div>
              <div className="flex space-x-4">
                <div>
                  <p className="text-sm font-semibold text-gray-700">Annual Revenue Range</p>
                  <p className="text-xs text-gray-600">{formData.annualRevenueRange}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-700">Price</p>
                  <p className="text-xs text-gray-600">{formData.price}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-700">Negotiation</p>
                  <p className="text-xs text-gray-600">{formData.isNegotiable}</p>
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700">Number of Employees</p>
                <p className="text-xs text-gray-600">{formData.numberOfEmployees || 'Not specified'}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700">Preferred Buyer Type</p>
                <p className="text-xs text-gray-600">{formData.preferredBuyerType}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700">Assets & Inventory</p>
                {formData.assetsAndInventory.length > 0 ? (
                  <ul className="text-xs text-gray-600 list-disc pl-4">
                    {formData.assetsAndInventory.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-gray-600">None</p>
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700">Debt & Liabilities</p>
                {formData.debtAndLiabilities.length > 0 ? (
                  <ul className="text-xs text-gray-600 list-disc pl-4">
                    {formData.debtAndLiabilities.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-gray-600">None</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700">Choose Listing Type <span className="text-red-600">*</span></label>
                <div className="relative mt-2">
                  <select
                    name="listingType"
                    value={formData.listingType}
                    onChange={handleInputChange}
                    className="w-full h-10 px-4 border text-gray-600 rounded-lg focus:outline-none focus:border-[#F26E52] appearance-none"
                  >
                    <option value="">Select one</option>
                    <option value="Standard Listing">Standard Listing (Free)</option>
                    <option value="Rebrivo Premium">Rebrivo Premium (Paid)</option>
                  </select>
                  <Image
                    src="/dropdown.png"
                    alt="Dropdown"
                    width={16}
                    height={16}
                    className="absolute right-3 top-3 pointer-events-none"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-between mt-6">
              <button
                onClick={handlePrevious}
                className="border border-[#F26E52] text-[#F26E52] px-6 py-2 rounded-md text-sm w-32 flex justify-center"
              >
                Edit
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !isFormComplete()}
                className={`h-12 rounded-lg bg-[#F26E52] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#e65a3e] disabled:opacity-50 flex items-center justify-center w-40 ${!isFormComplete() ? 'cursor-not-allowed' : ''}`}
              >
                {isSubmitting && <Loader />}
                {!isSubmitting && (isEditMode ? 'Update Listing' : 'Send for Review')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}