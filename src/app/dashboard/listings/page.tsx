'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import api from '../../../lib/api';
import Cookies from 'js-cookie';
import { getLoginRedirectUrl } from '../../../config/env';

interface Listing {
  id: string;
  name: string;
  category: string;
  location: string;
  value: string;
  status: string;
  views: number;
  inquiries: number;
  image: string;
  yearEstablished: string;
  reasonForSelling: string;
  annualRevenueRange: string;
  price: number;
  isNegotiable: boolean;
  businessType?: string;
  entityType?: string;
  isPremiumSale?: boolean;
  companyProfileUrl?: string;
  businessImagesUrls: string[];
}

export default function Listings() {
  const [activeTab, setActiveTab] = useState('All');
  const [visibleListings, setVisibleListings] = useState(6);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [showDeactivationModal, setShowDeactivationModal] = useState(false);
  const [deactivationReason, setDeactivationReason] = useState('');
  const [deactivationComment, setDeactivationComment] = useState('');
  const router = useRouter();

  const tabs = ['All', 'Active', 'Review', 'Sold', 'Deactivation Requested'];

  const deactivationReasons = [
    'Business already sold outside Rebrivo',
    'Changed my mind about selling',
    'New confidential information to protect',
    'Need to re-evaluate my pricing/positioning',
  ];

  useEffect(() => {
    const fetchListings = async () => {
      setLoading(true);
      const accessToken = Cookies.get('accessToken');
      const sellerDataString = Cookies.get('sellerData');

      if (!accessToken || !sellerDataString) {
        router.push(getLoginRedirectUrl('seller'));
        return;
      }

      try {
        const sellerData = JSON.parse(sellerDataString);
        const response = await api.get(`/seller/listings/fetch-all/${sellerData.id}`);
        if (response.status === 200) {
          const fetchedListings = response.data.listings.map((listing: any) => ({
            id: listing.id,
            name: listing.businessName || 'Unnamed Listing',
            category: listing.businessCategoryType || 'Unknown',
            location: listing.location || 'Unknown',
            value: `₦${(listing.price || 0).toLocaleString()}`,
            status: listing.status === 'PENDING' ? 'Review' :
                    listing.status === 'ACTIVE' ? 'Active' :
                    listing.status === 'SOLD' ? 'Sold' :
                    listing.status === 'PENDING_DEACTIVATION' ? 'Deactivation Requested' : listing.status,
            views: listing.unlockedByBuyers?.length || 0,
            inquiries: listing.listOfBuyerRequestingService?.length || 0,
            image: listing.businessImagesUrls[0] || '/ratel.png',
            yearEstablished: listing.yearEstablished || 'N/A',
            reasonForSelling: listing.reasonForSelling || 'Not specified',
            annualRevenueRange: listing.annualRevenueRange || 'N/A',
            price: listing.price || 0,
            isNegotiable: listing.isNegotiable || false,
            businessType: listing.businessType,
            entityType: listing.entityType,
            isPremiumSale: listing.isPremiumSale,
            companyProfileUrl: listing.companyProfileUrl,
            businessImagesUrls: listing.businessImagesUrls || [],
          }));
          setListings(fetchedListings);
        } else {
          setError('Unexpected response from server.');
          toast.error('Failed to load listings.');
        }
      } catch (err) {
        setError('Failed to load listings. Please try again.');
        toast.error('Failed to load listings.');
      } finally {
        setLoading(false);
      }
    };
    fetchListings();
  }, [router]);

  const filteredListings = listings.filter((listing) =>
    activeTab === 'All' ? true : listing.status === activeTab
  );

  const handleLoadMore = () => setVisibleListings((prev) => prev + 6);

  const handleEdit = (listing: Listing) => {
    router.push(`/dashboard/listings/new?listingId=${listing.id}`);
  };

  const handleDeactivationRequest = async (listingId: string) => {
    if (!deactivationReason) {
      toast.error('Please select a reason for deactivation.');
      return;
    }

    try {
      const accessToken = Cookies.get('accessToken');
      if (!accessToken) {
        router.push(getLoginRedirectUrl('seller'));
        return;
      }

      const payload = {
        reasonForDeactivation: deactivationReason,
        ...(deactivationComment && { additionalComment: deactivationComment }),
      };

      const response = await api.post(
        `/seller/listing/${listingId}/request-deactivation`,
        payload
      );

      if (response.status === 200) {
        toast.success(response.data.message || 'Deactivation request submitted successfully!');
        setShowDeactivationModal(false);
        setSelectedListing(null);
        setDeactivationReason('');
        setDeactivationComment('');
        // Refetch listings to ensure updated status
        const sellerData = JSON.parse(Cookies.get('sellerData') || '{}');
        const updatedResponse = await api.get(`/seller/listings/fetch-all/${sellerData.id}`);
        setListings(updatedResponse.data.listings.map((listing: any) => ({
          id: listing.id,
          name: listing.businessName || 'Unnamed Listing',
          category: listing.businessCategoryType || 'Unknown',
          location: listing.location || 'Unknown',
          value: `₦${(listing.price || 0).toLocaleString()}`,
          status: listing.status === 'PENDING' ? 'Review' :
                  listing.status === 'ACTIVE' ? 'Active' :
                  listing.status === 'SOLD' ? 'Sold' :
                  listing.status === 'PENDING_DEACTIVATION' ? 'Deactivation Requested' : listing.status,
          views: listing.unlockedByBuyers?.length || 0,
          inquiries: listing.listOfBuyerRequestingService?.length || 0,
          image: listing.businessImagesUrls[0] || '/ratel.png',
          yearEstablished: listing.yearEstablished || 'N/A',
          reasonForSelling: listing.reasonForSelling || 'Not specified',
          annualRevenueRange: listing.annualRevenueRange || 'N/A',
          price: listing.price || 0,
          isNegotiable: listing.isNegotiable || false,
          businessType: listing.businessType,
          entityType: listing.entityType,
          isPremiumSale: listing.isPremiumSale,
          companyProfileUrl: listing.companyProfileUrl,
          businessImagesUrls: listing.businessImagesUrls || [],
        })));
      } else {
        toast.error('Failed to submit deactivation request.');
      }
    } catch (err: any) {
      console.error('Error requesting deactivation:', err);
      toast.error(err.response?.data?.message || 'Failed to submit deactivation request.');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Image src="/loader.gif" alt="Loading" width={32} height={32} className="animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center">
        <p className="text-red-500">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 bg-[#F26E52] text-white px-4 py-2 rounded-md text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 relative">
      {/* Header Section */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-[#011631]">Manage Your Listings</h2>
          <p className="text-xs text-gray-600">
            View, edit, and track the performance of your active and past listings.
          </p>
        </div>
        <Link href="/dashboard/listings/new">
          <button className="flex items-center bg-[#F26E52] text-white px-4 py-3 rounded-md text-xs">
            <Image src="/add-listing.png" alt="Add Listing" width={16} height={16} className="mr-2" />
            Create New Listing
          </button>
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex space-x-4 border-b border-gray-200 mb-4">
        {tabs.map((tab) => (
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

      {/* Listings Content */}
      {filteredListings.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)]">
          <Image src="/no-listings.png" alt="No Listings" width={100} height={100} className="mb-6" />
          <h2 className="text-2xl font-bold text-[#011631] mb-2">No Listings Yet</h2>
          <p className="text-sm text-gray-600 text-center">
            Create a listing to showcase your business.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {filteredListings.slice(0, visibleListings).map((listing) => (
              <div
                key={listing.id}
                onClick={() => setSelectedListing(listing)}
                className="relative bg-white rounded-lg shadow-md overflow-hidden cursor-pointer transform transition-transform hover:scale-105 hover:shadow-lg"
              >
                <div className="w-full h-40">
                  <Image
                    src={listing.image}
                    alt={listing.name}
                    width={300}
                    height={160}
                    className="object-cover w-full h-full"
                  />
                </div>
                {listing.status === 'Sold' && (
                  <div className="absolute top-2 left-2">
                    <Image
                      src="/sold copy.png"
                      alt="Sold Tag"
                      width={100}
                      height={40}
                      className="object-contain"
                    />
                  </div>
                )}
                <div className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-sm font-semibold text-[#011631]">{listing.name}</h3>
                      <p className="text-xs text-gray-600">{listing.category}</p>
                      <p className="text-xs text-gray-600">{listing.location}</p>
                    </div>
                    <p className="text-sm font-semibold text-[#F26E52]">{listing.value}</p>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <div className="flex items-center space-x-1">
                      <span
                        className={`h-2 w-2 rounded-full ${
                          listing.status === 'Active'
                            ? 'bg-green-500'
                            : listing.status === 'Review'
                            ? 'bg-yellow-500'
                            : listing.status === 'Sold'
                            ? 'bg-red-500'
                            : listing.status === 'Deactivation Requested'
                            ? 'bg-orange-500'
                            : 'bg-gray-500'
                        }`}
                      ></span>
                      <p className="text-xs text-gray-600">{listing.status}</p>
                    </div>
                    <p className="text-xs text-gray-600">{listing.views} Views</p>
                    <p className="text-xs text-gray-600">{listing.inquiries} Inquiries</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {visibleListings < filteredListings.length && (
            <div className="flex justify-center mt-6">
              <button
                onClick={handleLoadMore}
                className="border border-[#F26E52] text-[#F26E52] px-6 py-2 rounded-md text-sm hover:bg-[#F26E52] hover:text-white transition-colors"
              >
                Load More
              </button>
            </div>
          )}
        </>
      )}

      {/* Listing Overlay */}
      {selectedListing && (
        <div className="fixed inset-0 bg-gradient-to-br from-gray-800/50 to-gray-900/50 flex justify-end items-center z-50">
          <div className="bg-white w-full max-w-sm h-full p-4 shadow-lg transform transition-transform duration-300 ease-in-out overflow-y-auto">
            <button onClick={() => setSelectedListing(null)} className="absolute top-4 right-4">
              <Image src="/cancel.png" alt="Cancel" width={16} height={16} />
            </button>
            <h2 className="text-xl font-bold text-[#011631] text-center">Edit Your Listing</h2>
            <p className="text-xs text-gray-600 text-center mt-2">
              Update your business details, financials, and visibility settings.
            </p>
            <div className="mt-6 space-y-6">
              <div>
                <p className="text-sm font-semibold text-gray-700">Business Name</p>
                <p className="text-gray-600">{selectedListing.name}</p>
              </div>
              <div className="flex justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-700">Category</p>
                  <p className="text-gray-600">{selectedListing.category}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-700">Location</p>
                  <p className="text-gray-600">{selectedListing.location}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-700">Year Established</p>
                  <p className="text-gray-600">{selectedListing.yearEstablished}</p>
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700">Reason for Selling</p>
                <p className="text-gray-600">{selectedListing.reasonForSelling}</p>
              </div>
              <div className="flex justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-700">Annual Revenue Range</p>
                  <p className="text-gray-600">{selectedListing.annualRevenueRange}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-700">Price</p>
                  <p className="text-gray-600">₦{selectedListing.price.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-700">Negotiation</p>
                  <p className="text-gray-600">{selectedListing.isNegotiable ? 'Yes' : 'No'}</p>
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700">Attachments</p>
                <div className="space-y-2">
                  {selectedListing.companyProfileUrl && (
                    <a
                      href={selectedListing.companyProfileUrl}
                      target="_blank"
                      className="text-gray-600 text-sm underline block"
                    >
                      Company Profile
                    </a>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    {selectedListing.businessImagesUrls.map((url, index) => (
                      <Image
                        key={index}
                        src={url}
                        alt={`Business Image ${index + 1}`}
                        width={100}
                        height={100}
                        className="object-cover rounded-md"
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex justify-between space-x-4">
                <button
                  onClick={() => setShowDeactivationModal(true)}
                  className="w-32 border border-[#F26E52] text-[#F26E52] px-6 py-2 rounded-md text-sm flex justify-center"
                >
                  Deactivate
                </button>
                <button
                  onClick={() => handleEdit(selectedListing)}
                  className="w-32 bg-[#F26E52] text-white px-6 py-2 rounded-md text-sm flex justify-center"
                >
                  Edit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Deactivation Request Modal */}
      {showDeactivationModal && selectedListing && (
        <div className="fixed inset-0 bg-gradient-to-br from-gray-800/50 to-gray-900/50 flex justify-center items-center z-50">
          <div className="bg-white rounded-lg p-6 shadow-lg w-full max-w-md">
            <h2 className="text-xl font-bold text-[#011631] mb-4">Request Listing Deactivation</h2>
            <p className="text-sm text-gray-600 mb-6">
              Please select a reason for deactivating this listing and provide any additional comments if necessary.
            </p>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-gray-700">Reason for Deactivation</label>
                <select
                  value={deactivationReason}
                  onChange={(e) => setDeactivationReason(e.target.value)}
                  className="w-full mt-1 p-2 border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#F26E52]"
                  aria-label="Reason for deactivation"
                >
                  <option value="" disabled>
                    Select a reason
                  </option>
                  {deactivationReasons.map((reason) => (
                    <option key={reason} value={reason}>
                      {reason}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700">Additional Comments (Optional)</label>
                <textarea
                  value={deactivationComment}
                  onChange={(e) => setDeactivationComment(e.target.value)}
                  placeholder="Provide any additional details..."
                  className="w-full mt-1 p-2 border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#F26E52]"
                  rows={4}
                  aria-label="Additional comments for deactivation"
                />
              </div>
            </div>
            <div className="flex justify-center space-x-4 mt-6">
              <button
                onClick={() => {
                  setShowDeactivationModal(false);
                  setDeactivationReason('');
                  setDeactivationComment('');
                }}
                className="text-gray-600 px-4 py-2 rounded-md border border-gray-300 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeactivationRequest(selectedListing.id)}
                className="bg-[#F26E52] text-white px-4 py-2 rounded-md"
              >
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}