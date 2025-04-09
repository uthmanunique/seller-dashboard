'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import WithdrawFundsOverlay from '@/src/components/WithdrawFundsOverlay'; // Ensure this file exists
import api from '@/src/lib/api';
import Cookies from 'js-cookie';
import axios from 'axios';

interface Transaction {
  id: string;
  type: 'credit' | 'debit';
  amount: number;
  status: 'completed' | 'processing' | 'failed';
  description: string;
  createdAt: string;
}

interface BackendTransaction {
  _id?: string;
  transactionType: string;
  transactionRef?: string;
  responseDescription?: string;
  amount: string;
  status: string;
  createdAt: string;
}

export default function WalletTransactions() {
  const [activeTab, setActiveTab] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(8);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [isTrackOverlayOpen, setIsTrackOverlayOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [balance, setBalance] = useState<number>(0);
  const [isWalletActivated, setIsWalletActivated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const router = useRouter();
  const tabs = ['All', 'Processing', 'Completed', 'Failed'];

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    const accessToken = Cookies.get('accessToken');
    const sellerDataString = Cookies.get('sellerData');

    if (!accessToken || !sellerDataString) {
      router.push('http://localhost:3000/auth/login?role=seller');
      return;
    }

    const sellerData = JSON.parse(sellerDataString);
    const sellerId = sellerData.id;

    try {
      const walletResponse = await api.get('/wallets/fetch-info', {
        params: { userType: 'SELLER', userId: sellerId },
      });
      const walletData = walletResponse.data.wallet;
      setIsWalletActivated(!!walletData);
      setBalance(walletData?.balance || 0);

      const transactionResponse = await api.post(
        `/wallets/seller/transaction/all?userId=${sellerId}&userType=SELLER`,
        {}
      );
      const mappedTransactions: Transaction[] = (transactionResponse.data || []).map((tx: BackendTransaction) => ({
        id: tx._id || tx.transactionRef || 'unknown-id',
        type: tx.transactionType === 'WITHDRAWAL' ? 'debit' : 'credit',
        amount: Number(tx.amount) || 0,
        status:
          tx.status.toLowerCase() === 'success'
            ? 'completed'
            : (tx.status.toLowerCase() as 'completed' | 'processing' | 'failed'),
        description: tx.responseDescription || 'No description',
        createdAt: tx.createdAt || new Date().toISOString(),
      }));
      setTransactions(mappedTransactions);
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        setIsWalletActivated(false);
        setBalance(0);
        setTransactions([]);
      } else {
        console.error('Error fetching wallet data:', error);
        router.push('http://localhost:3000/auth/login?role=seller');
      }
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleWithdrawSuccess = () => {
    setIsWithdrawOpen(false);
    fetchData();
  };

  const filteredTransactions = transactions.filter((transaction) =>
    activeTab === 'All' ? true : transaction.status === activeTab.toLowerCase()
  );

  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const transactionCounts = {
    processing: transactions.filter((t) => t.status === 'processing').length,
    completed: transactions.filter((t) => t.status === 'completed').length,
    failed: transactions.filter((t) => t.status === 'failed').length,
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatAmount = (amount: number) => `₦${amount.toLocaleString()}`;

  const renderTrackOverlay = () => {
    if (!isTrackOverlayOpen || !selectedTransaction) return null;
  
    const { status, id, amount, createdAt, description } = selectedTransaction;
    const headings = {
      processing: 'Your Payment is Being Processed',
      completed: 'Payment Successfully Processed',
      failed: 'Payment Failed – Action Required',
    };
    const subtexts = {
      processing: "We're verifying your transaction and ensuring a smooth escrow settlement.",
      completed: 'Your escrow payment has been successfully completed, and the funds have been released to your account.',
      failed: 'There was an issue processing your escrow payment. Please review the details and take necessary action.',
    };
    const notes = {
      processing: 'Note: Once verification is complete, the funds will be released to your linked account.',
      completed: 'Note: The transaction is now complete, and your funds have been deposited.',
      failed: 'Note: Your escrow payment could not be processed due to an issue.',
    };
    const dateLabels = {
      processing: 'Estimated Completion',
      completed: 'Date Received',
      failed: 'Date Attempted',
    };
  
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-gray-800/50 to-gray-900/50 flex justify-center items-center z-50">
        <div className="bg-white p-6 rounded-lg w-full max-w-md relative">
          <button onClick={() => setIsTrackOverlayOpen(false)} className="absolute top-4 right-4">
            <Image src="/cancel.png" alt="Close" width={16} height={16} />
          </button>
          <h2 className="text-xl font-bold text-[#011631]">{headings[status]}</h2>
          <p className="text-sm text-gray-600 mt-1">{subtexts[status]}</p>
          <div className="mt-4">
            <h3 className="text-lg font-semibold text-[#011631]">Transaction Details</h3>
            <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
              <span className="text-gray-600">Transaction ID</span>
              <span className="text-gray-800">{id}</span>
              <span className="text-gray-600">Amount</span>
              <span className="text-gray-800">{formatAmount(amount)}</span>
              <span className="text-gray-600">Status</span>
              <span className="flex items-center text-gray-800">
                <span
                  className={`w-2 h-2 rounded-full mr-1 ${
                    status === 'completed' ? 'bg-green-500' : status === 'processing' ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                />
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </span>
              <span className="text-gray-600">{dateLabels[status]}</span>
              <span className="text-gray-800">{formatDate(createdAt)}</span>
              <span className="text-gray-600">Description</span>
              <span className="text-gray-800">{description}</span>
            </div>
            <p className="text-xs text-gray-600 mt-2">{notes[status]}</p>
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

  if (!isWalletActivated) {
    return (
      <div className="p-4">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-bold text-[#011631]">Wallet & Transactions</h2>
            <p className="text-xs text-gray-600">
              View your wallet balance, track transactions, and withdraw funds to your preferred payment method.
            </p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)]">
          <Image src="/no-listings.png" alt="No Wallet" width={120} height={120} className="mb-4" />
          <h3 className="text-lg font-semibold text-[#011631] mb-2">No Wallet Activated</h3>
          <p className="text-sm text-gray-600 text-center max-w-md mb-6">
            It looks like you haven’t set up your wallet yet. Activate your wallet to start managing your transactions and withdrawing funds.
          </p>
          <button
            onClick={() => router.push('/dashboard')} // Redirect to dashboard to trigger wallet creation
            className="w-full max-w-md bg-[#F26E52] text-white py-4 rounded-md text-lg font-semibold hover:bg-[#e65c41] transition-colors"
          >
            Create Wallet Now
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-[#011631]">Wallet & Transactions</h2>
          <p className="text-xs text-gray-600">
            View your wallet balance, track transactions, and withdraw funds to your preferred payment method.
          </p>
        </div>
        <button
          onClick={() => setIsWithdrawOpen(true)}
          disabled={!balance}
          className={`px-6 py-2 rounded-md text-sm ${
            balance ? 'bg-[#F26E52] text-white' : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          Withdraw Funds
        </button>
      </div>

      <div className="bg-[#F26E52] text-white p-4 rounded-lg mb-6 flex justify-between items-center">
        <div className="flex items-center">
          <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center mr-4">
            <Image src="/escrow.png" alt="Transaction" width={48} height={48} />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Transaction Status</h3>
            <p className="text-sm">Balance: {formatAmount(balance)}</p>
          </div>
        </div>
        <div className="flex space-x-6">
          <div>
            <p className="text-sm">Processing</p>
            <p className="text-2xl font-bold">{transactionCounts.processing}</p>
          </div>
          <div>
            <p className="text-sm">Completed</p>
            <p className="text-2xl font-bold">{transactionCounts.completed}</p>
          </div>
          <div>
            <p className="text-sm">Failed</p>
            <p className="text-2xl font-bold">{transactionCounts.failed}</p>
          </div>
        </div>
      </div>

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

      <div className="bg-white rounded-lg shadow-md overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-[#FFF1EE]">
              <th className="p-3 text-sm font-semibold text-gray-600">Transaction ID</th>
              <th className="p-3 text-sm font-semibold text-gray-600">Type</th>
              <th className="p-3 text-sm font-semibold text-gray-600">Date</th>
              <th className="p-3 text-sm font-semibold text-gray-600">Amount</th>
              <th className="p-3 text-sm font-semibold text-gray-600">Status</th>
              <th className="p-3 text-sm font-semibold text-gray-600">Action</th>
            </tr>
          </thead>
          <tbody>
            {paginatedTransactions.length > 0 ? (
              paginatedTransactions.map((transaction) => (
                <tr key={transaction.id} className="border-b border-gray-200">
                  <td className="p-3 text-sm text-gray-600">{transaction.id.slice(0, 15)}...</td>
                  <td className="p-3 text-sm text-gray-600 capitalize">{transaction.type}</td>
                  <td className="p-3 text-sm text-gray-600">{formatDate(transaction.createdAt)}</td>
                  <td className="p-3 text-sm text-gray-600">{formatAmount(transaction.amount)}</td>
                  <td className="p-3">
                    <span
                      className={`text-sm px-3 py-1 rounded-full ${
                        transaction.status === 'completed'
                          ? 'bg-green-100 text-green-600'
                          : transaction.status === 'processing'
                          ? 'bg-yellow-100 text-yellow-600'
                          : 'bg-red-100 text-red-600'
                      }`}
                    >
                      {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                    </span>
                  </td>
                  <td className="p-3">
                    <button
                      onClick={() => {
                        setSelectedTransaction(transaction);
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
                  No transactions found for {activeTab} status.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between items-center mt-4">
        <div className="flex items-center space-x-2">
          <p className="text-sm text-gray-600">Show Result: {paginatedTransactions.length}</p>
          <select
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="border border-gray-300 rounded-md p-1 text-sm text-gray-800"
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
              <option key={num} value={num}>
                {num}
              </option>
            ))}
          </select>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className={`p-2 rounded-md ${
              currentPage === 1 ? 'bg-[#F26E52]' : 'bg-[#F26E52]'
            }`}
          >
            <Image src="/CaretLeft.png" alt="Previous" width={16} height={16} />
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              className={`px-3 py-1 rounded-md text-[#F26E52] ${
                currentPage === page ? 'font-bold' : ''
              }`}
            >
              {page}
            </button>
          ))}
          <button
            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className={`p-2 rounded-md ${
              currentPage === totalPages ? 'bg-[#F26E52]' : 'bg-[#F26E52]'
            }`}
          >
            <Image src="/CaretRight.png" alt="Next" width={16} height={16} />
          </button>
        </div>
      </div>

      <WithdrawFundsOverlay
        isOpen={isWithdrawOpen}
        onClose={() => setIsWithdrawOpen(false)}
        onWithdrawSuccess={handleWithdrawSuccess}
        availableBalance={balance}
      />
      {renderTrackOverlay()}
    </div>
  );
}