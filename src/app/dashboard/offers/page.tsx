// 'use client';

// import { useState, useEffect, useRef } from 'react';
// import Image from 'next/image';
// import { useRouter } from 'next/navigation';
// import { toast } from 'react-toastify';
// import api from '../../../lib/api';
// import Cookies from 'js-cookie';
// import { getLoginRedirectUrl } from '../../../config/env';

// interface Offer {
//   id: string;
//   buyerId: string;
//   buyerName: string;
//   listingId: string;
//   offerPrice: number;
//   offerMessage: string;
//   status: 'Pending' | 'Accepted' | 'Rejected';
//   dateCreated: string;
//   listingName: string;
//   image: string;
// }

// export default function OffersPage() {
//   const [activeTab, setActiveTab] = useState('All');
//   const [offers, setOffers] = useState<Offer[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);
//   const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
//   const [showResponseOverlay, setShowResponseOverlay] = useState(false);
//   const [responseType, setResponseType] = useState<'ACCEPTED' | 'REJECTED' | ''>('');
//   const [responseMessage, setResponseMessage] = useState('');
//   const [isConfirmingAccept, setIsConfirmingAccept] = useState(false);
//   const overlayRef = useRef<HTMLDivElement>(null);
//   const router = useRouter();

//   const tabs = ['All', 'Pending', 'Accepted', 'Rejected'];

//   useEffect(() => {
//     const fetchOffers = async () => {
//       setLoading(true);
//       const accessToken = Cookies.get('accessToken');
//       const sellerDataString = Cookies.get('sellerData');

//       if (!accessToken || !sellerDataString) {
//         console.log('No access token or seller data, redirecting to login');
//         router.push(getLoginRedirectUrl('seller'));
//         return;
//       }

//       try {
//         const sellerData = JSON.parse(sellerDataString);
//         console.log('Fetching offers for seller ID:', sellerData.id);
//         const response = await api.get(`/seller/listings/my-offers/${sellerData.id}`);
//         console.log('API Response:', response);

//         if (response.status === 200) {
//           const fetchedOffers = response.data.data.offers.map((offer: any) => ({
//             id: offer.id,
//             buyerId: offer.buyer.id,
//             buyerName: offer.buyer.name || 'Unknown Buyer',
//             listingId: offer.listingId,
//             offerPrice: offer.offerPrice || 0,
//             offerMessage: offer.offerMessage || 'No message provided',
//             status: offer.status === 'PENDING' ? 'Pending' :
//                     offer.status === 'ACCEPTED' ? 'Accepted' :
//                     offer.status === 'REJECTED' ? 'Rejected' : 'Pending',
//             dateCreated: new Date(offer.dateCreated).toLocaleDateString(),
//             listingName: offer.listing?.businessName || 'Unknown Listing',
//             image: offer.listing?.businessImagesUrls?.[0] || '/ratel.png',
//           }));
//           console.log('Fetched Offers:', fetchedOffers);
//           setOffers(fetchedOffers);
//         } else {
//           console.log('Unexpected response status:', response.status);
//           setError('Unexpected response from server.');
//           toast.error('Failed to load offers.');
//         }
//       } catch (err: any) {
//         console.error('Error fetching offers:', err);
//         setError('Failed to load offers. Please try again.');
//         toast.error(err.response?.data?.message || 'Failed to load offers.');
//       } finally {
//         setLoading(false);
//       }
//     };
//     fetchOffers();
//   }, [router]);

//   useEffect(() => {
//     const handleClickOutside = (event: MouseEvent) => {
//       if (overlayRef.current && !overlayRef.current.contains(event.target as Node)) {
//         setShowResponseOverlay(false);
//         setResponseType('');
//         setResponseMessage('');
//         setIsConfirmingAccept(false);
//       }
//     };
//     if (showResponseOverlay) {
//       document.addEventListener('mousedown', handleClickOutside);
//     }
//     return () => {
//       document.removeEventListener('mousedown', handleClickOutside);
//     };
//   }, [showResponseOverlay]);

//   const filteredOffers = offers.filter((offer) =>
//     activeTab === 'All' ? true : offer.status === activeTab
//   );

//   const handleRespond = async () => {
//     if (!selectedOffer || !responseType || !responseMessage.trim()) {
//       toast.error('Please provide a response message and select a response type.');
//       return;
//     }

//     if (responseType === 'ACCEPTED' && !isConfirmingAccept) {
//       setIsConfirmingAccept(true);
//       return;
//     }

//     try {
//       const accessToken = Cookies.get('accessToken');
//       if (!accessToken) {
//         router.push(getLoginRedirectUrl('seller'));
//         return;
//       }

//       const payload = {
//         responseMessage,
//         responseType,
//       };

//       console.log('Responding to offer with payload:', payload);

//       const response = await api.patch(
//         `/seller/listing/${selectedOffer.listingId}/offers/${selectedOffer.buyerId}/respond`,
//         payload
//       );

//       if (response.status === 200) {
//         toast.success(response.data.message || 'Response submitted successfully!');
//         setOffers((prev) =>
//           prev.map((offer) =>
//             offer.id === selectedOffer.id
//               ? { ...offer, status: responseType === 'ACCEPTED' ? 'Accepted' : 'Rejected' }
//               : offer
//           )
//         );
//         setShowResponseOverlay(false);
//         setSelectedOffer(null);
//         setResponseType('');
//         setResponseMessage('');
//         setIsConfirmingAccept(false);
//       } else {
//         toast.error('Failed to submit response.');
//       }
//     } catch (err: any) {
//       console.error('Error responding to offer:', err);
//       const errorMessage = err.response?.status === 500
//         ? 'Server error. Please contact support or try again later.'
//         : err.response?.data?.message || 'Failed to submit response.';
//       toast.error(errorMessage);
//     }
//   };

//   if (loading) {
//     return (
//       <div className="flex justify-center items-center h-screen">
//         <Image src="/loader.gif" alt="Loading" width={32} height={32} className="animate-spin" />
//       </div>
//     );
//   }

//   if (error) {
//     return (
//       <div className="p-4 text-center">
//         <p className="text-red-500">{error}</p>
//         <button
//           onClick={() => window.location.reload()}
//           className="mt-4 bg-gradient-to-r from-[#F26E52] to-[#e65a3e] text-white px-4 py-2 rounded-md text-sm"
//         >
//           Retry
//         </button>
//       </div>
//     );
//   }

//   return (
//     <div className="p-4">
//       {/* Header Section */}
//       <div className="flex justify-between items-center mb-6">
//         <div>
//           <h2 className="text-xl font-bold text-[#011631]">Manage Offers</h2>
//           <p className="text-xs text-gray-600">
//             View and respond to offers received for your listings.
//           </p>
//         </div>
//       </div>

//       {/* Tabs */}
//       <div className="flex space-x-4 border-b border-gray-200 mb-4">
//         {tabs.map((tab) => (
//           <button
//             key={tab}
//             onClick={() => setActiveTab(tab)}
//             className={`pb-2 text-sm font-semibold ${
//               activeTab === tab
//                 ? 'text-[#F26E52] border-b-2 border-[#F26E52]'
//                 : 'text-gray-600 hover:text-[#F26E52]'
//             }`}
//           >
//             {tab}
//           </button>
//         ))}
//       </div>

//       {/* Offers Content */}
//       {filteredOffers.length === 0 ? (
//         <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)]">
//           <Image src="/no-listings.png" alt="No Offers" width={100} height={100} className="mb-6" />
//           <h2 className="text-2xl font-bold text-[#011631] mb-2">No Offers Yet</h2>
//           <p className="text-sm text-gray-600 text-center">
//             You haven't received any offers for your listings.
//           </p>
//         </div>
//       ) : (
//         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//           {filteredOffers.map((offer) => (
//             <div
//               key={offer.id}
//               onClick={() => {
//                 if (offer.status === 'Pending') {
//                   setSelectedOffer(offer);
//                   setShowResponseOverlay(true);
//                 }
//               }}
//               className={`relative bg-white rounded-lg shadow-md overflow-hidden transform transition-transform hover:scale-105 hover:shadow-lg ${
//                 offer.status === 'Pending' ? 'cursor-pointer' : 'cursor-default'
//               }`}
//             >
//               <div className="w-full h-40">
//                 <Image
//                   src={offer.image}
//                   alt={offer.listingName}
//                   width={300}
//                   height={160}
//                   className="object-cover w-full h-full"
//                 />
//               </div>
//               <div className="p-4">
//                 <div className="flex justify-between items-start">
//                   <div>
//                     <h3 className="text-sm font-semibold text-[#011631]">{offer.buyerName}</h3>
//                     <p className="text-xs text-gray-600">Listing: {offer.listingName}</p>
//                     <p className="text-xs text-gray-600">Date: {offer.dateCreated}</p>
//                   </div>
//                   <p className="text-sm font-semibold text-[#F26E52]">
//                     ₦{offer.offerPrice.toLocaleString()}
//                   </p>
//                 </div>
//                 <p className="text-xs text-gray-600 mt-2 truncate">{offer.offerMessage}</p>
//                 <div className="flex justify-between items-center mt-2">
//                   <div className="flex items-center space-x-1">
//                     <span
//                       className={`h-2 w-2 rounded-full ${
//                         offer.status === 'Pending'
//                           ? 'bg-yellow-500'
//                           : offer.status === 'Accepted'
//                           ? 'bg-green-500'
//                           : 'bg-red-500'
//                       }`}
//                     ></span>
//                     <p className="text-xs text-gray-600">{offer.status}</p>
//                   </div>
//                 </div>
//               </div>
//             </div>
//           ))}
//         </div>
//       )}

//       {/* Response Overlay */}
//       {showResponseOverlay && selectedOffer && (
//         <div className="fixed inset-0 bg-gradient-to-br from-gray-800/50 to-gray-900/50 z-50 flex justify-end">
//           <div
//             ref={overlayRef}
//             className="bg-gradient-to-br from-white to-gray-50 w-full max-w-md h-full p-6 shadow-2xl rounded-l-2xl transform transition-transform duration-300 ease-in-out overflow-y-auto"
//           >
//             <button
//               onClick={() => {
//                 setShowResponseOverlay(false);
//                 setResponseType('');
//                 setResponseMessage('');
//                 setIsConfirmingAccept(false);
//               }}
//               className="absolute top-4 right-4 p-2 hover:bg-gray-200 rounded-full transition-colors"
//             >
//               <Image src="/cancel.png" alt="Cancel" width={20} height={20} />
//             </button>

//             {!isConfirmingAccept ? (
//               <div className="space-y-6">
//                 <h2 className="text-2xl font-extrabold text-[#011631] text-center mb-6">Respond to Offer</h2>

//                 <div className="space-y-4">
//                   <div>
//                     <p className="text-sm font-semibold text-gray-700">Buyer</p>
//                     <p className="text-sm text-gray-600">{selectedOffer.buyerName}</p>
//                   </div>
//                   <div>
//                     <p className="text-sm font-semibold text-gray-700">Listing</p>
//                     <p className="text-sm text-gray-600">{selectedOffer.listingName}</p>
//                   </div>
//                   <div className="flex justify-between">
//                     <div>
//                       <p className="text-sm font-semibold text-gray-700">Offer Price</p>
//                       <p className="text-sm text-gray-600">₦{selectedOffer.offerPrice.toLocaleString()}</p>
//                     </div>
//                     <div>
//                       <p className="text-sm font-semibold text-gray-700">Date</p>
//                       <p className="text-sm text-gray-600">{selectedOffer.dateCreated}</p>
//                     </div>
//                   </div>
//                   <div>
//                     <p className="text-sm font-semibold text-gray-700">Offer Message</p>
//                     <p className="text-sm text-gray-600">{selectedOffer.offerMessage}</p>
//                   </div>
//                   <div className="relative">
//                     <label
//                       htmlFor="responseType"
//                       className="absolute -top-2 left-3 bg-white px-1 text-xs text-gray-700 font-medium"
//                     >
//                       Response Type
//                     </label>
//                     <select
//                       id="responseType"
//                       value={responseType}
//                       onChange={(e) => setResponseType(e.target.value as 'ACCEPTED' | 'REJECTED')}
//                       className="w-full h-12 px-4 pt-4 border border-gray-300 rounded-lg text-gray-800 focus:ring-2 focus:ring-[#F26E52] focus:border-transparent appearance-none transition-all"
//                       aria-label="Response type"
//                     >
//                       <option value="" disabled>
//                         Select response
//                       </option>
//                       <option value="ACCEPTED">Accept</option>
//                       <option value="REJECTED">Reject</option>
//                     </select>
//                     <Image
//                       src="/dropdown.png"
//                       alt="Dropdown"
//                       width={12}
//                       height={12}
//                       className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none"
//                     />
//                   </div>
//                   <div className="relative">
//                     <label
//                       htmlFor="responseMessage"
//                       className="absolute -top-2 left-3 bg-white px-1 text-xs text-gray-700 font-medium"
//                     >
//                       Response Message
//                     </label>
//                     <textarea
//                       id="responseMessage"
//                       value={responseMessage}
//                       onChange={(e) => setResponseMessage(e.target.value)}
//                       placeholder="Provide your response..."
//                       className="w-full h-24 px-4 pt-4 border border-gray-300 rounded-lg text-gray-800 focus:ring-2 focus:ring-[#F26E52] focus:border-transparent transition-all"
//                       rows={4}
//                       aria-label="Response message"
//                     />
//                   </div>
//                 </div>

//                 <button
//                   onClick={handleRespond}
//                   disabled={!responseType || !responseMessage.trim()}
//                   className="w-full h-12 rounded-lg bg-gradient-to-r from-[#F26E52] to-[#e65a3e] text-white text-base font-semibold hover:from-[#e65a3e] hover:to-[#d4462a] disabled:opacity-50 transition-all flex items-center justify-center shadow-md"
//                 >
//                   Submit Response
//                 </button>
//               </div>
//             ) : (
//               <div className="space-y-6">
//                 <h2 className="text-2xl font-extrabold text-[#011631] text-center mb-6">Confirm Offer Acceptance</h2>
//                 <p className="text-sm text-gray-600 text-center mb-6">
//                   Are you sure you want to accept this offer from {selectedOffer.buyerName} for ₦
//                   {selectedOffer.offerPrice.toLocaleString()}?
//                 </p>

//                 <div className="space-y-4">
//                   <div>
//                     <p className="text-sm font-semibold text-gray-700">Buyer</p>
//                     <p className="text-sm text-gray-600">{selectedOffer.buyerName}</p>
//                   </div>
//                   <div>
//                     <p className="text-sm font-semibold text-gray-700">Listing</p>
//                     <p className="text-sm text-gray-600">{selectedOffer.listingName}</p>
//                   </div>
//                   <div className="flex justify-between">
//                     <div>
//                       <p className="text-sm font-semibold text-gray-700">Offer Price</p>
//                       <p className="text-sm text-gray-600">₦{selectedOffer.offerPrice.toLocaleString()}</p>
//                     </div>
//                     <div>
//                       <p className="text-sm font-semibold text-gray-700">Date</p>
//                       <p className="text-sm text-gray-600">{selectedOffer.dateCreated}</p>
//                     </div>
//                   </div>
//                   <div>
//                     <p className="text-sm font-semibold text-gray-700">Your Response Message</p>
//                     <p className="text-sm text-gray-600">{responseMessage}</p>
//                   </div>
//                 </div>

//                 <div className="flex justify-center space-x-4">
//                   <button
//                     onClick={() => setIsConfirmingAccept(false)}
//                     className="w-1/2 h-12 border border-gray-300 rounded-lg text-gray-600 text-base font-semibold hover:bg-gray-100 transition-all"
//                   >
//                     Cancel
//                   </button>
//                   <button
//                     onClick={handleRespond}
//                     className="w-1/2 h-12 rounded-lg bg-gradient-to-r from-[#F26E52] to-[#e65a3e] text-white text-base font-semibold hover:from-[#e65a3e] hover:to-[#d4462a] transition-all shadow-md"
//                   >
//                     Confirm Acceptance
//                   </button>
//                 </div>
//               </div>
//             )}
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }

'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import api from '../../../lib/api';
import Cookies from 'js-cookie';
import { getLoginRedirectUrl } from '../../../config/env';

interface Offer {
  id: string;
  buyerId: string;
  buyerName: string;
  listingId: string;
  offerPrice: number;
  offerMessage: string;
  status: 'Pending' | 'Accepted' | 'Rejected';
  dateCreated: string;
  listingName: string;
  image: string;
}

// Mock listings for names and images
interface Listing {
  id: string;
  name: string;
  image: string;
}

const mockListings: Listing[] = [
  { id: 'ykqtn0w9vr8s27qw88q6lhwr', name: 'Tech Startup', image: '/ratel.png' },
  { id: 'xzqtn0w9vr8s27qw88q6lhws', name: 'E-commerce Store', image: '/ratel.png' },
  { id: 'abqtn0w9vr8s27qw88q6lhwt', name: 'Mobile App', image: '/ratel.png' },
];

export default function OffersPage() {
  const [activeTab, setActiveTab] = useState('All');
  // Mock data for visualization
  const [offers, setOffers] = useState<Offer[]>([
    {
      id: 'a6a22144-4fb2-4c2f-8fe1-3a11a59c3e0e',
      buyerId: '4bf237df-5102-4bde-ade2-16fa6bcd149a',
      buyerName: 'Emmanuel Aboyeji',
      listingId: 'ykqtn0w9vr8s27qw88q6lhwr',
      offerPrice: 100000,
      offerMessage: 'This is my offer for your business.',
      status: 'Pending',
      dateCreated: '4/14/2025',
      listingName: 'Tech Startup',
      image: '/ratel.png',
    },
    {
      id: 'b7b33255-5gc3-5d3g-9gf2-4b22b60d4f0f',
      buyerId: '5cg348eg-6213-5cef-bef3-27gb7cde250b',
      buyerName: 'Jane Doe',
      listingId: 'xzqtn0w9vr8s27qw88q6lhws',
      offerPrice: 150000,
      offerMessage: 'Excited about your business! Offering a fair price.',
      status: 'Accepted',
      dateCreated: '4/13/2025',
      listingName: 'E-commerce Store',
      image: '/ratel.png',
    },
    {
      id: 'c8c44366-6hd4-6e4h-0hg3-5c33c71e5g1g',
      buyerId: '6dh459fh-7324-6dfg-cfg4-38hc8def361c',
      buyerName: 'John Smith',
      listingId: 'abqtn0w9vr8s27qw88q6lhwt',
      offerPrice: 80000,
      offerMessage: 'Interested but my budget is limited.',
      status: 'Rejected',
      dateCreated: '4/12/2025',
      listingName: 'Mobile App',
      image: '/ratel.png',
    },
  ]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [showResponseOverlay, setShowResponseOverlay] = useState(false);
  const [responseType, setResponseType] = useState<'ACCEPTED' | 'REJECTED' | ''>('');
  const [responseMessage, setResponseMessage] = useState('');
  const [isConfirmingAccept, setIsConfirmingAccept] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const tabs = ['All', 'Pending', 'Accepted', 'Rejected'];

  useEffect(() => {
    const fetchOffers = async () => {
      setLoading(true);
      const accessToken = Cookies.get('accessToken');
      const sellerDataString = Cookies.get('sellerData');

      if (!accessToken || !sellerDataString) {
        console.log('No access token or seller data, redirecting to login');
        router.push(getLoginRedirectUrl('seller'));
        return;
      }

      try {
        const sellerData = JSON.parse(sellerDataString);
        console.log('Fetching offers for seller ID:', sellerData.id);
        const response = await api.get(`/seller/listings/my-offers/${sellerData.id}`);
        console.log('API Response:', response);

        if (response.status === 200) {
          const fetchedOffers = response.data.data.offers.map((offer: any) => ({
            id: offer.id,
            buyerId: offer.buyer.id,
            buyerName: offer.buyer.name || 'Unknown Buyer',
            listingId: offer.listingId,
            offerPrice: offer.offerPrice || 0,
            offerMessage: offer.offerMessage || 'No message provided',
            status: offer.status === 'PENDING' ? 'Pending' :
                    offer.status === 'ACCEPTED' ? 'Accepted' :
                    offer.status === 'REJECTED' ? 'Rejected' : 'Pending',
            dateCreated: new Date(offer.dateCreated).toLocaleDateString(),
            listingName: offer.listing?.businessName || mockListings.find((l) => l.id === offer.listingId)?.name || 'Unknown Listing',
            image: offer.listing?.businessImagesUrls?.[0] || mockListings.find((l) => l.id === offer.listingId)?.image || '/ratel.png',
          }));
          console.log('Fetched Offers:', fetchedOffers);
          setOffers(fetchedOffers.length ? fetchedOffers : offers); // Keep mock data if API returns empty
        } else {
          console.log('Unexpected response status:', response.status);
          setError('Unexpected response from server.');
          toast.error('Failed to load offers.');
        }
      } catch (err: any) {
        console.error('Error fetching offers:', err);
        setError('Failed to load offers. Please try again.');
        toast.error(err.response?.data?.message || 'Failed to load offers.');
      } finally {
        setLoading(false);
      }
    };
    fetchOffers();
  }, [router]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (overlayRef.current && !overlayRef.current.contains(event.target as Node)) {
        setShowResponseOverlay(false);
        setResponseType('');
        setResponseMessage('');
        setIsConfirmingAccept(false);
      }
    };
    if (showResponseOverlay) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showResponseOverlay]);

  const filteredOffers = offers.filter((offer) =>
    activeTab === 'All' ? true : offer.status === activeTab
  );

  const handleRespond = async () => {
    if (!selectedOffer || !responseType || !responseMessage.trim()) {
      toast.error('Please provide a response message and select a response type.');
      return;
    }

    if (responseType === 'ACCEPTED' && !isConfirmingAccept) {
      setIsConfirmingAccept(true);
      return;
    }

    try {
      const accessToken = Cookies.get('accessToken');
      if (!accessToken) {
        router.push(getLoginRedirectUrl('seller'));
        return;
      }

      const payload = {
        responseMessage,
        responseType,
      };

      console.log('Responding to offer with payload:', payload);

      const response = await api.patch(
        `/seller/listing/${selectedOffer.listingId}/offers/${selectedOffer.buyerId}/respond`,
        payload
      );

      if (response.status === 200) {
        toast.success(response.data.message || 'Response submitted successfully!');
        setOffers((prev) =>
          prev.map((offer) =>
            offer.id === selectedOffer.id
              ? { ...offer, status: responseType === 'ACCEPTED' ? 'Accepted' : 'Rejected' }
              : offer
          )
        );
        setShowResponseOverlay(false);
        setSelectedOffer(null);
        setResponseType('');
        setResponseMessage('');
        setIsConfirmingAccept(false);
      } else {
        toast.error('Failed to submit response.');
      }
    } catch (err: any) {
      console.error('Error responding to offer:', err);
      const errorMessage = err.response?.status === 500
        ? 'Server error. Please contact support or try again later.'
        : err.response?.data?.message || 'Failed to submit response.';
      toast.error(errorMessage);
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
          className="mt-4 bg-gradient-to-r from-[#F26E52] to-[#e65a3e] text-white px-4 py-2 rounded-md text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Header Section */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-[#011631]">Manage Offers</h2>
          <p className="text-xs text-gray-600">
            View and respond to offers received for your listings.
          </p>
        </div>
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

      {/* Offers Content */}
      {filteredOffers.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)]">
          <Image src="/no-listings.png" alt="No Offers" width={100} height={100} className="mb-6" />
          <h2 className="text-2xl font-bold text-[#011631] mb-2">No Offers Yet</h2>
          <p className="text-sm text-gray-600 text-center">
            You haven't received any offers for your listings.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {filteredOffers.map((offer) => (
            <div
              key={offer.id}
              onClick={() => {
                if (offer.status === 'Pending') {
                  setSelectedOffer(offer);
                  setShowResponseOverlay(true);
                }
              }}
              className={`relative bg-white rounded-lg shadow-md overflow-hidden transform transition-transform hover:scale-105 hover:shadow-lg ${
                offer.status === 'Pending' ? 'cursor-pointer' : 'cursor-default'
              }`}
            >
              <div className="w-full h-40">
                <Image
                  src={offer.image}
                  alt={offer.listingName}
                  width={300}
                  height={160}
                  className="object-cover w-full h-full"
                />
              </div>
              <div className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-sm font-semibold text-[#011631]">{offer.buyerName}</h3>
                    <p className="text-xs text-gray-600">Listing: {offer.listingName}</p>
                    <p className="text-xs text-gray-600">Date: {offer.dateCreated}</p>
                  </div>
                  <p className="text-sm font-semibold text-[#F26E52]">
                    ₦{offer.offerPrice.toLocaleString()}
                  </p>
                </div>
                <p className="text-xs text-gray-600 mt-2 truncate">{offer.offerMessage}</p>
                <div className="flex justify-between items-center mt-2">
                  <div className="flex items-center space-x-1">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        offer.status === 'Pending'
                          ? 'bg-yellow-500'
                          : offer.status === 'Accepted'
                          ? 'bg-green-500'
                          : 'bg-red-500'
                      }`}
                    ></span>
                    <p className="text-xs text-gray-600">{offer.status}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Response Overlay */}
      {showResponseOverlay && selectedOffer && (
        <div className="fixed inset-0 bg-gradient-to-br from-gray-800/50 to-gray-900/50 z-50 flex justify-end">
          <div
            ref={overlayRef}
            className="bg-gradient-to-br from-white to-gray-50 w-full max-w-md h-full p-6 shadow-2xl rounded-l-2xl transform transition-transform duration-300 ease-in-out overflow-y-auto"
          >
            <button
              onClick={() => {
                setShowResponseOverlay(false);
                setResponseType('');
                setResponseMessage('');
                setIsConfirmingAccept(false);
              }}
              className="absolute top-4 right-4 p-2 hover:bg-gray-200 rounded-full transition-colors"
            >
              <Image src="/cancel.png" alt="Cancel" width={20} height={20} />
            </button>

            {!isConfirmingAccept ? (
              <div className="space-y-6">
                <h2 className="text-2xl font-extrabold text-[#011631] text-center mb-6">Respond to Offer</h2>

                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-700">Buyer</p>
                    <p className="text-sm text-gray-600">{selectedOffer.buyerName}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-700">Listing</p>
                    <p className="text-sm text-gray-600">{selectedOffer.listingName}</p>
                  </div>
                  <div className="flex justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-700">Offer Price</p>
                      <p className="text-sm text-gray-600">₦{selectedOffer.offerPrice.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-700">Date</p>
                      <p className="text-sm text-gray-600">{selectedOffer.dateCreated}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-700">Offer Message</p>
                    <p className="text-sm text-gray-600">{selectedOffer.offerMessage}</p>
                  </div>
                  <div className="relative">
                    <label
                      htmlFor="responseType"
                      className="absolute -top-2 left-3 bg-white px-1 text-xs text-gray-700 font-medium"
                    >
                      Response Type
                    </label>
                    <select
                      id="responseType"
                      value={responseType}
                      onChange={(e) => setResponseType(e.target.value as 'ACCEPTED' | 'REJECTED')}
                      className="w-full h-12 px-4 pt-4 border border-gray-300 rounded-lg text-gray-800 focus:ring-2 focus:ring-[#F26E52] focus:border-transparent appearance-none transition-all"
                      aria-label="Response type"
                    >
                      <option value="" disabled>
                        Select response
                      </option>
                      <option value="ACCEPTED">Accept</option>
                      <option value="REJECTED">Reject</option>
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
                    <label
                      htmlFor="responseMessage"
                      className="absolute -top-2 left-3 bg-white px-1 text-xs text-gray-700 font-medium"
                    >
                      Response Message
                    </label>
                    <textarea
                      id="responseMessage"
                      value={responseMessage}
                      onChange={(e) => setResponseMessage(e.target.value)}
                      placeholder="Provide your response..."
                      className="w-full h-24 px-4 pt-4 border border-gray-300 rounded-lg text-gray-800 focus:ring-2 focus:ring-[#F26E52] focus:border-transparent transition-all"
                      rows={4}
                      aria-label="Response message"
                    />
                  </div>
                </div>

                <button
                  onClick={handleRespond}
                  disabled={!responseType || !responseMessage.trim()}
                  className="w-full h-12 rounded-lg bg-gradient-to-r from-[#F26E52] to-[#e65a3e] text-white text-base font-semibold hover:from-[#e65a3e] hover:to-[#d4462a] disabled:opacity-50 transition-all flex items-center justify-center shadow-md"
                >
                  Submit Response
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <h2 className="text-2xl font-extrabold text-[#011631] text-center mb-6">Confirm Offer Acceptance</h2>
                <p className="text-sm text-gray-600 text-center mb-6">
                  Are you sure you want to accept this offer from {selectedOffer.buyerName} for ₦
                  {selectedOffer.offerPrice.toLocaleString()}?
                </p>

                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-700">Buyer</p>
                    <p className="text-sm text-gray-600">{selectedOffer.buyerName}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-700">Listing</p>
                    <p className="text-sm text-gray-600">{selectedOffer.listingName}</p>
                  </div>
                  <div className="flex justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-700">Offer Price</p>
                      <p className="text-sm text-gray-600">₦{selectedOffer.offerPrice.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-700">Date</p>
                      <p className="text-sm text-gray-600">{selectedOffer.dateCreated}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-700">Your Response Message</p>
                    <p className="text-sm text-gray-600">{responseMessage}</p>
                  </div>
                </div>

                <div className="flex justify-center space-x-4">
                  <button
                    onClick={() => setIsConfirmingAccept(false)}
                    className="w-1/2 h-12 border border-gray-300 rounded-lg text-gray-600 text-base font-semibold hover:bg-gray-100 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRespond}
                    className="w-1/2 h-12 rounded-lg bg-gradient-to-r from-[#F26E52] to-[#e65a3e] text-white text-base font-semibold hover:from-[#e65a3e] hover:to-[#d4462a] transition-all shadow-md"
                  >
                    Confirm Acceptance
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}