'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import api from '../../../lib/api'; // Import centralized API instance
import Cookies from 'js-cookie';
import { getLoginRedirectUrl } from '../../../config/env'; // Import centralized login URL

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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const router = useRouter();

  const tabs = ['All', 'Approved', 'Review', 'Sold'];

  useEffect(() => {
    const fetchListings = async () => {
      setLoading(true);
      console.log('Listings fetchListings - Starting');

      const accessToken = Cookies.get('accessToken');
      const sellerDataString = Cookies.get('sellerData');

      if (!accessToken || !sellerDataString) {
        console.log('Listings - No tokens or seller data, redirecting to login');
        router.push(getLoginRedirectUrl('seller')); // Use centralized login URL
        return;
      }

      try {
        const sellerData = JSON.parse(sellerDataString);
        console.log('Listings - Seller Data from cookies:', sellerData);

        const response = await api.get(
          `/seller/listings/fetch-all/${sellerData.id}`
        ); // Use api instance
        console.log('Listings - API Response:', response.data);

        if (response.status === 200) {
          const fetchedListings = response.data.listings.map((listing: {
            id: string;
            businessName: string;
            businessCategoryType: string;
            location: string;
            price: number;
            status: string;
            unlockedByBuyers?: string[];
            listOfBuyerRequestingService?: string[];
            businessImagesUrls: string[];
            yearEstablished: string;
            reasonForSelling: string;
            annualRevenueRange: string;
            isNegotiable: boolean;
            businessType?: string;
            entityType?: string;
            isPremiumSale?: boolean;
            companyProfileUrl?: string;
          }) => {
            // Normalize status to title case
            const rawStatus = listing.status || 'Unknown';
            const normalizedStatus =
              rawStatus === 'PENDING' ? 'Review' :
              rawStatus === 'APPROVED' ? 'Approved' :
              rawStatus === 'SOLD' ? 'Sold' : rawStatus;

            return {
              id: listing.id,
              name: listing.businessName || 'Unnamed Listing',
              category: listing.businessCategoryType || 'Unknown',
              location: listing.location || 'Unknown',
              value: `₦${(listing.price || 0).toLocaleString()}`,
              status: normalizedStatus,
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
            };
          });
          setListings(fetchedListings);
          console.log('Listings - Listings set:', fetchedListings);
        } else {
          console.log('Listings - Unexpected API status:', response.status);
          setError('Unexpected response from server.');
          toast.error('Failed to load listings.');
        }
      } catch (err) {
        console.error('Listings - Fetch Error:', err);
        setError('Failed to load listings. Please try again.');
        toast.error('Failed to load listings.');
        // Note: The api instance handles 401 redirects via interceptors
      } finally {
        setLoading(false);
        console.log('Listings fetchListings - Ended');
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

  const handleDelete = async (listingId: string) => {
    try {
      const accessToken = Cookies.get('accessToken');
      if (!accessToken) {
        console.log('Listings - No access token for delete, redirecting to login');
        router.push(getLoginRedirectUrl('seller')); // Use centralized login URL
        return;
      }

      await api.delete(`/seller/listings/delete/${listingId}`); // Use api instance
      setListings((prev) => prev.filter((listing) => listing.id !== listingId));
      setShowDeleteConfirm(false);
      setSelectedListing(null);
      toast.success('Listing deleted successfully!');
    } catch (err) {
      console.error('Listings - Error deleting listing:', err);
      toast.error('Failed to delete listing.');
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
                      src="/sold-tag.png" // Adjust path to your PNG
                      alt="Sold Tag"
                      width={60}
                      height={20}
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
                          listing.status === 'Approved'
                            ? 'bg-green-500'
                            : listing.status === 'Review'
                            ? 'bg-yellow-500'
                            : listing.status === 'Sold'
                            ? 'bg-red-500'
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
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-32 border border-[#F26E52] text-[#F26E52] px-6 py-2 rounded-md text-sm flex justify-center"
                >
                  Delete
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

      {/* Delete Confirmation Overlay */}
      {showDeleteConfirm && selectedListing && (
        <div className="fixed inset-0 bg-gradient-to-br from-gray-800/50 to-gray-900/50 flex justify-center items-center z-50">
          <div className="bg-white rounded-lg p-6 shadow-lg">
            <h2 className="text-xl font-bold text-[#011631] mb-4">Delete?</h2>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to delete this listing?
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="text-gray-600 px-4 py-2 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(selectedListing.id)}
                className="bg-[#F26E52] text-white px-4 py-2 rounded-md"
              >
                Proceed
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}