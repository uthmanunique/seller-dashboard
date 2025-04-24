"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import api from "../../lib/api"; // central API instance
import { getLoginRedirectUrl } from "../../config/env"; // centralized login URL
import { useAuth } from "@/src/context/AuthContext";
// Type definitions for listings, transactions, and dashboard data
interface Listing {
  id: string;
  name: string;
  value: string;
  category: string;
  location: string;
  status: string;
  views: number;
  inquiries: number;
  images: string[];
  createdAt: string;
}

interface Transaction {
  _id: string;
  transactionRef: string;
  receiver: { id: string; name: string };
  businessName?: string;
  amount: string;
  status: string;
  type?: "credit" | "debit";
  description?: string;
  createdAt: string;
}

interface DashboardData {
  reviewsCount: number;
  activeListingCount: number;
  soldListingCount: number;
  totalRevenue: number;
  listings: Listing[];
  transactions: Transaction[];
}

interface ApiListing {
  id: string;
  businessName: string;
  businessCategoryType: string;
  location: string;
  status: string;
  price: number;
  listOfBuyerRequestingService: string[];
  businessImagesUrls: string[];
  createdAt: string;
}

interface ApiTransaction {
  _id: string;
  transactionRef: string;
  receiver: { id: string; name: string };
  amount: string;
  status: string;
  createdAt: string;
}

interface ApiDashboardData {
  reviewsCount?: number;
  activeListingCount?: number;
  soldListingCount?: number;
  totalRevenue?: number;
  listings?: ApiListing[];
  transactions?: ApiTransaction[];
}

export default function DashboardOverview() {
  const [hasPendingReview, setHasPendingReview] = useState<boolean>(false);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isTrackOverlayOpen, setIsTrackOverlayOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  // Use auth context instead of cookies directly
  const { user, loading: authLoading } = useAuth();

  const fetchData = useCallback(async () => {
    if (authLoading) {
      return;
    }
    if (!user || !user.data || !user.data.id) {
      console.log("DashboardOverview - No authenticated user, redirecting to login");
      window.location.href = getLoginRedirectUrl("seller");
      return;
    }

    setIsLoading(true);
    console.log("DashboardOverview fetchData - Starting");

    const sellerData = user.data;
    try {
      console.log("DashboardOverview - Seller Data from auth context:", sellerData);
      const response = await api.get<ApiDashboardData>(`/seller/dashboard/details/${sellerData.id}`);
      console.log("DashboardOverview - Dashboard Data from API:", response.data);

      const apiData = response.data;

      // Safely default listings and transactions if undefined
      const listingsFromApi: ApiListing[] = apiData.listings || [];
      const transactionsFromApi: ApiTransaction[] = apiData.transactions || [];

      const parsedDashboardData: DashboardData = {
        reviewsCount: apiData.reviewsCount || 0,
        activeListingCount: apiData.activeListingCount || 0,
        soldListingCount: apiData.soldListingCount || 0,
        totalRevenue: apiData.totalRevenue || 0,
        listings: listingsFromApi.map((listing) => ({
          id: listing.id,
          name: listing.businessName,
          value: `₦${listing.price.toLocaleString()}`,
          category: listing.businessCategoryType,
          location: listing.location,
          status: listing.status === "PENDING" ? "Review" : listing.status,
          views: 0, // Default value if API does not return this data
          inquiries: listing.listOfBuyerRequestingService?.length || 0,
          images: (listing.businessImagesUrls && listing.businessImagesUrls.length)
            ? listing.businessImagesUrls
            : ["/sample-image.jpg"],
          createdAt: listing.createdAt,
        })),
        transactions: transactionsFromApi.map((tx) => ({
          _id: tx._id,
          transactionRef: tx.transactionRef,
          receiver: tx.receiver,
          // Look-up business name from listings if available
          businessName:
            listingsFromApi.find((l) => l.id === tx.receiver.id)?.businessName || "N/A",
          amount: tx.amount,
          status: tx.status,
          createdAt: tx.createdAt,
        })),
      };

      setDashboardData(parsedDashboardData);
      setListings(parsedDashboardData.listings.slice(0, 4));
      setSelectedListing(parsedDashboardData.listings[0] || null);
      setHasPendingReview(parsedDashboardData.listings.some((l) => l.status === "Review"));
      console.log("DashboardOverview - Data set successfully");
    } catch (err) {
      console.error("DashboardOverview - Fetch Error:", err);
      setDashboardData({
        reviewsCount: 0,
        activeListingCount: 0,
        soldListingCount: 0,
        totalRevenue: 0,
        listings: [],
        transactions: [],
      });
      setListings([]);
      console.log("DashboardOverview - Fell back to empty data due to error");
    } finally {
      setIsLoading(false);
      console.log("DashboardOverview fetchData - Ended");
    }
  }, [authLoading, user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const handleStorageChange = () => {
      const updatedValue = localStorage.getItem("hasPendingReview") === "true";
      setHasPendingReview(updatedValue);
    };

    window.addEventListener("storage", handleStorageChange);
    const interval = setInterval(() => {
      const updatedValue = localStorage.getItem("hasPendingReview") === "true";
      if (updatedValue !== hasPendingReview) {
        setHasPendingReview(updatedValue);
      }
    }, 1000);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, [hasPendingReview]);

  const handlePrevImage = () => {
    if (selectedListing) {
      setCurrentImageIndex((prev) =>
        prev === 0 ? selectedListing.images.length - 1 : prev - 1
      );
    }
  };

  const handleNextImage = () => {
    if (selectedListing) {
      setCurrentImageIndex((prev) =>
        prev === selectedListing.images.length - 1 ? 0 : prev + 1
      );
    }
  };

  const renderTrackOverlay = () => {
    if (!isTrackOverlayOpen || !selectedTransaction) return null;

    const { status, _id, amount, createdAt, description } = selectedTransaction;
    const headings = {
      pending: "Your Payment is Being Processed",
      success: "Payment Successfully Processed",
      failed: "Payment Failed – Action Required",
    };
    const subtexts = {
      pending: "We're verifying your transaction and ensuring a smooth escrow settlement.",
      success:
        "Your escrow payment has been successfully completed, and the funds have been released to your account.",
      failed:
        "There was an issue processing your escrow payment. Please review the details and take necessary action.",
    };
    const notes = {
      pending: "Note: Once verification is complete, the funds will be released to your linked account.",
      success: "Note: The transaction is now complete, and your funds have been deposited.",
      failed: "Note: Your escrow payment could not be processed due to an issue.",
    };
    const dateLabels = {
      pending: "Estimated Completion",
      success: "Date Received",
      failed: "Date Attempted",
    };

    const formatDate = (dateString: string) =>
      new Date(dateString).toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    const formatAmount = (amount: string) =>
      `₦${parseFloat(amount).toLocaleString()}`;


    return (
      <div className="fixed inset-0 bg-gradient-to-br from-gray-800/50 to-gray-900/50 flex justify-center items-center z-50">
        <div className="bg-white p-6 rounded-lg w-full max-w-md relative">
          <button onClick={() => setIsTrackOverlayOpen(false)} className="absolute top-4 right-4">
            <Image src="/cancel.png" alt="Close" width={16} height={16} />
          </button>
          <h2 className="text-xl font-bold text-[#011631]">
            {headings[status.toLowerCase() as keyof typeof headings]}
          </h2>
          <p className="text-sm text-gray-600 mt-1">{subtexts[status.toLowerCase() as keyof typeof subtexts]}</p>
          <div className="mt-4">
            <h3 className="text-lg font-semibold text-[#011631]">Transaction Details</h3>
            <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
              <span className="text-gray-600">Transaction ID</span>
              <span className="text-gray-800">{_id}</span>
              <span className="text-gray-600">Amount</span>
              <span className="text-gray-800">{formatAmount(amount)}</span>
              <span className="text-gray-600">Status</span>
              <span className="flex items-center text-gray-800">
                <span
                  className={`w-2 h-2 rounded-full mr-1 ${
                    status === 'SUCCESS' ? 'bg-green-500' : status === 'PENDING' ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                />
                {status === 'SUCCESS' ? 'Completed' : status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()}
              </span>
              <span className="text-gray-600">{dateLabels[status.toLowerCase() as keyof typeof dateLabels]}</span>
              <span className="text-gray-800">{formatDate(createdAt)}</span>
              <span className="text-gray-600">Description</span>
              <span className="text-gray-800">{description || 'N/A'}</span>
            </div>
            <p className="text-xs text-gray-600 mt-2">{notes[status.toLowerCase() as keyof typeof notes]}</p>
          </div>
          <div className="mt-6">
            <button
              onClick={() => setIsTrackOverlayOpen(false)}
              className="w-full bg-[#F26E52] text-white py-3 rounded-md text-base font-semibold hover:bg-[#e65c41] transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Image src="/loader.gif" alt="Loading" width={32} height={32} className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 px-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-[#011631]">Welcome to your Dashboard</h1>
          <p className="text-xs text-gray-600">
            Manage listings, track performance, and connect with buyers.
          </p>
        </div>
        <Link href="/dashboard/listings/new">
          <button className="flex items-center bg-[#F26E52] text-white px-4 py-3 rounded-md text-xs">
            <Image src="/add-listing.png" alt="Add Listing" width={16} height={16} className="mr-2" />
            Create New Listing
          </button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-md shadow-xl flex items-center space-x-6 transition-transform hover:scale-105 hover:shadow-lg">
          <Image src="/active.png" alt="Active" width={60} height={60} />
          <div>
            <p className="text-sm text-gray-600">Active</p>
            <p className="text-xl font-semibold text-[#F26E52]">
              {dashboardData?.activeListingCount || 0}
            </p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-md shadow-xl flex items-center space-x-6 transition-transform hover:scale-105 hover:shadow-lg">
          <Image src="/review.png" alt="Review" width={60} height={60} />
          <div>
            <p className="text-sm text-gray-600">Review</p>
            <p className="text-xl font-semibold text-[#F26E52]">
              {dashboardData?.reviewsCount || 0}
            </p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-md shadow-xl flex items-center space-x-6 transition-transform hover:scale-105 hover:shadow-lg">
          <Image src="/sold.png" alt="Sold" width={60} height={60} />
          <div>
            <p className="text-sm text-gray-600">Sold</p>
            <p className="text-xl font-semibold text-[#F26E52]">
              {dashboardData?.soldListingCount || 0}
            </p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-md shadow-xl flex items-center space-x-6 transition-transform hover:scale-105 hover:shadow-lg">
          <Image src="/revenue.png" alt="Revenue" width={60} height={60} />
          <div>
            <p className="text-sm text-gray-600">Revenue</p>
            <p className="text-xl font-semibold text-[#F26E52]">
              ₦{(dashboardData?.totalRevenue || 0).toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      <>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-md shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-[#011631]">Listings</h2>
              <div className="relative">
                <select
                  className="h-8 px-2 border text-gray-600 rounded-md text-xs focus:outline-none focus:border-[#F26E52] appearance-none"
                  onChange={(e) => {
                    const filter = e.target.value;
                    const filteredListings = dashboardData?.listings
                      .filter((l) => l.status === filter)
                      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                      .slice(0, 4) || [];
                    setListings(filteredListings);
                    setSelectedListing(filteredListings[0] || null);
                    setCurrentImageIndex(0);
                  }}
                >
                  <option value="Active">Active</option>
                  <option value="Review">Review</option>
                  <option value="Sold">Sold</option>
                </select>
                <Image
                  src="/dropdown.png"
                  alt="Dropdown"
                  width={12}
                  height={12}
                  className="absolute right-2 top-3 pointer-events-none"
                />
              </div>
            </div>
            {selectedListing ? (
              <div>
                <Image
                  src={selectedListing.images[currentImageIndex]}
                  alt={selectedListing.name}
                  width={400}
                  height={300}
                  className="w-full max-w-[500px] h-[300px] object-fill rounded-md mx-auto"
                />
                <div className="mt-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-semibold text-[#011631]">{selectedListing.name}</h3>
                    <p className="text-sm font-semibold text-[#F26E52]">{selectedListing.value}</p>
                  </div>
                  <p className="text-xs text-gray-600">{selectedListing.category}</p>
                  <p className="text-xs text-gray-600">{selectedListing.location}</p>
                  <div className="flex items-center space-x-2 mt-2">
                    <div className="flex items-center">
                      <span
                        className={`h-3 w-3 rounded-full mr-1 ${
                          selectedListing.status === 'Active'
                            ? 'bg-green-500'
                            : selectedListing.status === 'Review'
                            ? 'bg-orange-500'
                            : 'bg-gray-500'
                        }`}
                      ></span>
                      <p className="text-xs text-gray-600">{selectedListing.status}</p>
                    </div>
                    <p className="text-xs text-gray-600">Views: {selectedListing.views}</p>
                    <p className="text-xs text-gray-600">Inquiries: {selectedListing.inquiries}</p>
                  </div>
                </div>
                <div className="flex justify-between items-center mt-4">
                  <button onClick={handlePrevImage} className="bg-gray-800 bg-opacity-50 rounded-full p-1">
                    <Image src="/arrow-left.png" alt="Left" width={16} height={16} />
                  </button>
                  <div className="flex space-x-1">
                    {selectedListing.images.map((_, index) => (
                      <span
                        key={index}
                        className={`h-2 w-2 rounded-full ${
                          index === currentImageIndex ? 'bg-[#F26E52]' : 'bg-gray-400'
                        }`}
                      ></span>
                    ))}
                  </div>
                  <button onClick={handleNextImage} className="bg-gray-800 bg-opacity-50 rounded-full p-1">
                    <Image src="/arrow-right-2.png" alt="Right" width={16} height={16} />
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-600">No listings available.</p>
            )}
          </div>

          <div className="bg-white p-6 rounded-md shadow-sm">
            <h2 className="text-lg font-semibold text-[#011631] mb-4">All Listings</h2>
            <div className="space-y-4">
              {listings.length ? (
                listings.map((listing) => (
                  <div
                    key={listing.id}
                    className="flex items-center space-x-4 cursor-pointer hover:bg-gray-100 p-2 rounded-md"
                    onClick={() => {
                      setSelectedListing(listing);
                      setCurrentImageIndex(0);
                    }}
                  >
                    <Image
                      src={listing.images[0]}
                      alt={listing.name}
                      width={120}
                      height={120}
                      className="rounded-md"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-[#011631]">{listing.name}</p>
                      <p className="text-xs text-gray-600">{listing.category}</p>
                      <p className="text-xs text-gray-600">{listing.location}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-[#F26E52]">{listing.value}</p>
                      <p className="text-xs text-gray-600">{listing.views} views</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-gray-600">No listings available.</p>
              )}
            </div>
            <div className="mt-4 text-center">
              <Link href="/dashboard/listings" className="inline-flex items-center text-[#F26E52] text-sm">
                Manage Listings
                <Image src="/arrow-right.png" alt="Arrow Right" width={16} height={16} className="ml-1" />
              </Link>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-md shadow-sm">
          <h2 className="text-lg font-semibold text-[#011631] mb-4">Escrow Summary</h2>
          <div className="bg-[#F26E52] text-white p-6 rounded-md flex justify-between items-center mb-4">
            <div className="flex items-center space-x-2">
              <Image src="/escrow.png" alt="Transaction Status" width={48} height={48} />
              <p className="text-xl font-semibold">Transaction Status</p>
            </div>
            <div className="flex space-x-6 align-center">
              <div>
                <p className="text-xl">Active</p>
                <p className="text-lg font-semibold">
                  {dashboardData?.transactions.filter((tx) => tx.status === 'PENDING').length || 0}
                </p>
              </div>
              <div>
                <p className="text-xl">Pending</p>
                <p className="text-lg font-semibold">
                  {dashboardData?.transactions.filter((tx) => tx.status === 'PENDING').length || 0}
                </p>
              </div>
              <div>
                <p className="text-xl">Received</p>
                <p className="text-lg font-semibold">
                  {dashboardData?.transactions.filter((tx) => tx.status === 'SUCCESS').length || 0}
                </p>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[#FFF1EE]">
                  <th className="p-3 text-sm font-semibold text-gray-600">Transaction ID</th>
                  <th className="p-3 text-sm font-semibold text-gray-600">Buyer Name</th>
                  <th className="p-3 text-sm font-semibold text-gray-600">Business Sold</th>
                  <th className="p-3 text-sm font-semibold text-gray-600">Escrow Amount</th>
                  <th className="p-3 text-sm font-semibold text-gray-600">Status</th>
                  <th className="p-3 text-sm font-semibold text-gray-600">Action</th>
                </tr>
              </thead>
              <tbody>
                {dashboardData?.transactions.length ? (
                  dashboardData.transactions.map((tx) => (
                    <tr key={tx._id} className="border-b border-gray-200">
                      <td className="p-3 text-sm text-gray-600">{tx.transactionRef.slice(0, 15)}...</td>
                      <td className="p-3 text-sm text-gray-600">{tx.receiver.name}</td>
                      <td className="p-3 text-sm text-gray-600">{tx.businessName || 'N/A'}</td>
                      <td className="p-3 text-sm text-gray-600">₦{parseFloat(tx.amount).toLocaleString()}</td>
                      <td className="p-3">
                        <span
                          className={`text-sm px-3 py-1 rounded-full ${
                            tx.status === 'SUCCESS'
                              ? 'bg-green-100 text-green-600'
                              : tx.status === 'PENDING'
                              ? 'bg-yellow-100 text-yellow-600'
                              : 'bg-red-100 text-red-600'
                          }`}
                        >
                          {tx.status === 'SUCCESS'
                            ? 'Completed'
                            : tx.status.charAt(0).toUpperCase() + tx.status.slice(1).toLowerCase()}
                        </span>
                      </td>
                      <td className="p-3">
                        <button
                          onClick={() => {
                            setSelectedTransaction({
                              _id: tx._id,
                              transactionRef: tx.transactionRef,
                              receiver: tx.receiver,
                              businessName: tx.businessName,
                              amount: tx.amount,
                              status: tx.status,
                              type: tx.type || 'credit',
                              description: tx.description || 'Escrow Payment',
                              createdAt: tx.createdAt || new Date().toISOString(),
                            });
                            setIsTrackOverlayOpen(true);
                          }}
                          className="text-[#F26E52] text-xs hover:underline"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="p-3 text-center text-gray-600">
                      No transaction status yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </>
      {renderTrackOverlay()}
    </div>
  );
}