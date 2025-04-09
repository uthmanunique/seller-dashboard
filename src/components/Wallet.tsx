//src/components/Wallet.tsx
'use client';

import { useState } from 'react';
import Image from 'next/image';

interface WalletProps {
  onOpenWalletOverlay: () => void;
  isActivated: boolean;
  onOpenWithdraw: () => void;
  balance: number; // Add balance prop
}

export default function Wallet({ onOpenWalletOverlay, isActivated, onOpenWithdraw, balance }: WalletProps) {
  const [isBalanceVisible, setIsBalanceVisible] = useState(true);

  return (
    <div className="relative bg-[#011631] p-3 rounded-md">
      <div className={`${!isActivated && 'blur-sm'}`}>
        <h3 className="text-sm font-bold text-white mb-2">Wallet</h3>
        <div className="border-t border-gray-600 mb-2" />
        <p className="text-[10px] text-gray-300">Available Balance</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1">
            <p className="text-sm font-semibold text-white">
              {isBalanceVisible ? (
                `₦${balance.toLocaleString()}`
              ) : (
                <span className="text-gray-400">••••••</span>
              )}
              <span className="text-[10px] text-gray-400">.00</span>
            </p>
            <button
              onClick={() => setIsBalanceVisible(!isBalanceVisible)}
              aria-label={isBalanceVisible ? 'Hide balance' : 'Show balance'}
            >
              <Image
                src="/eye.png"
                alt={isBalanceVisible ? 'Hide' : 'Show'}
                width={16}
                height={16}
              />
            </button>
          </div>
        </div>
        <div className="flex justify-center mt-3">
          <button
            onClick={onOpenWithdraw}
            className="flex flex-col items-center"
            disabled={!isActivated}
          >
            <p className="text-[10px] text-gray-300">Withdraw</p>
            <Image
              src="/withdraw.png"
              alt="Withdraw"
              width={24}
              height={24}
              className="mt-1"
            />
          </button>
        </div>
      </div>

      {!isActivated && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-md">
          <button
            onClick={onOpenWalletOverlay}
            className="flex items-center px-3 py-3 bg-[#011631] text-white rounded-md text-xs"
          >
            <Image src="/wallet.png" alt="Wallet" width={16} height={16} className="mr-1" />
            Create A Wallet
          </button>
        </div>
      )}
    </div>
  );
}