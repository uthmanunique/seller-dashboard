'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import api from '../../../lib/api'; // Import centralized API instance
import Cookies from 'js-cookie';
import { toast } from 'react-toastify';
import { getLoginRedirectUrl } from '../../../config/env'; // Import centralized login URL

export default function ContactPage() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFormValid, setIsFormValid] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const router = useRouter();

  useEffect(() => {
    const accessToken = Cookies.get('accessToken');
    const sellerDataString = Cookies.get('sellerData');

    if (!accessToken || !sellerDataString) {
      router.push(getLoginRedirectUrl('seller')); // Use centralized login URL
      return;
    }

    try {
      const sellerData = JSON.parse(sellerDataString);
      setFirstName(sellerData.firstName || '');
      setLastName(sellerData.lastName || '');
      setEmail(sellerData.email || '');
    } catch (err) {
      console.error('Error parsing seller data:', err);
      router.push(getLoginRedirectUrl('seller')); // Use centralized login URL
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const isValid =
      firstName.trim() &&
      lastName.trim() &&
      phoneNumber.trim() &&
      email.trim() &&
      message.trim();
    setIsFormValid(!!isValid);
  }, [firstName, lastName, phoneNumber, email, message]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    const accessToken = Cookies.get('accessToken');
    const sellerDataString = Cookies.get('sellerData');

    if (!accessToken || !sellerDataString) {
      router.push(getLoginRedirectUrl('seller')); // Use centralized login URL
      return;
    }

    try {
      const response = await api.post('/contact-us/message', {
        firstName,
        lastName,
        phoneNumber,
        email,
        message,
      });

      if (response.status === 201) {
        toast.success("Message Sent Successfully, We'll Get Back To You Shortly.");
        setFirstName('');
        setLastName('');
        setPhoneNumber('');
        setEmail('');
        setMessage('');
      }
    } catch (err: any) {
      console.error('Error submitting contact form:', err.response?.data || err.message);
      setError('Failed to send message. Please try again.');
      toast.error('Failed to send message.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Image src="/loader.gif" alt="Loading" width={32} height={32} className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="w-2/3 mx-auto">
        <h3 className="text-lg font-semibold text-[#F26E52] text-center mb-2">
          Contact Us
        </h3>
        <h2 className="text-2xl font-bold text-[#011631] text-center mb-4">
          We respond to messages swiftly
        </h2>
        <p className="text-center text-gray-600 mb-8">
          We’d love to hear from you. Please fill out this form.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 space-y-1">
              <label htmlFor="firstName" className="block text-sm text-gray-600">
                First Name
              </label>
              <input
                type="text"
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Enter your first name"
                className="w-full h-12 px-4 border text-gray-600 rounded-lg focus:outline-none focus:border-[#F26E52]"
                required
                disabled={isSubmitting}
              />
            </div>
            <div className="flex-1 space-y-1">
              <label htmlFor="lastName" className="block text-sm text-gray-600">
                Last Name
              </label>
              <input
                type="text"
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Enter your last name"
                className="w-full h-12 px-4 border text-gray-600 rounded-lg focus:outline-none focus:border-[#F26E52]"
                required
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="phoneNumber" className="block text-sm text-gray-600">
              Phone Number
            </label>
            <input
              type="tel"
              id="phoneNumber"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="Enter your phone number"
              className="w-full h-12 px-4 border text-gray-600 rounded-lg focus:outline-none focus:border-[#F26E52]"
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="email" className="block text-sm text-gray-600">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="w-full h-12 px-4 border text-gray-600 rounded-lg focus:outline-none focus:border-[#F26E52]"
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="message" className="block text-sm text-gray-600">
              Message
            </label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter your message"
              className="w-full h-32 px-4 py-2 border text-gray-600 rounded-lg focus:outline-none focus:border-[#F26E52]"
              required
              disabled={isSubmitting}
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting || !isFormValid}
            className="h-12 rounded-lg bg-[#F26E52] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#e65a3e] disabled:opacity-50 flex items-center justify-center"
          >
            {isSubmitting && (
              <Image src="/loader.gif" alt="Loading" width={16} height={16} className="mr-2 animate-spin" />
            )}
            Send Message
          </button>
        </form>
      </div>
    </div>
  );
}