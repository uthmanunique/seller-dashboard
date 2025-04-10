'use client';

import { useState, useEffect, useRef, ChangeEvent } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import api from '../../../lib/api';
import Cookies from 'js-cookie';
import { getLoginRedirectUrl } from '../../../config/env';
import { AxiosError } from 'axios'; // Import AxiosError

interface Sender {
  id: string;
  name: string;
  role: 'BUYER' | 'SELLER' | 'ADMIN';
}

interface MessageData {
  id: string;
  content: string;
  sender: Sender;
  receiver: Sender;
  conversationId: string;
  status: string;
  isResponse: boolean;
  createdAt: string;
  updatedAt: string;
  attachments?: string[];
}

interface Conversation {
  conversationId: string;
  messages: MessageData[];
}

interface UIMessage {
  id: string;
  sender: string;
  preview: string;
  timestamp: string;
  conversation: {
    id: string;
    senderId: string;
    sender: string;
    message: string;
    time: string;
    attachments?: string[];
    delivered?: boolean;
    error?: boolean;
    avatar?: string;
    pending?: boolean;
  }[];
  date: string;
}

interface PendingMessage {
  id: string;
  senderId: string;
  sender: string;
  message: string;
  time: string;
  attachments?: string[];
  delivered?: boolean;
  avatar?: string;
  pending?: boolean;
  error?: boolean;
  conversationId: string;
}

export default function Messages() {
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const messageCounter = useRef(0);

  useEffect(() => {
    const fetchMessages = async () => {
      setLoading(true);
      console.log('fetchMessages: Starting');
      const accessToken = Cookies.get('accessToken');
      const sellerDataString = Cookies.get('sellerData');

      if (!accessToken || !sellerDataString) {
        console.log('fetchMessages: No tokens, redirecting');
        router.push(getLoginRedirectUrl('seller'));
        return;
      }

      let sellerId: string;
      try {
        const sellerData = JSON.parse(sellerDataString);
        sellerId = sellerData.id;
        console.log('fetchMessages: Seller ID:', sellerId);
      } catch (err) {
        console.error('fetchMessages: Error parsing seller data:', err);
        router.push(getLoginRedirectUrl('seller'));
        return;
      }

      try {
        const approvedResponse = await api.get(`/messages/seller/${sellerId}/get-approved-messages`);
        const approvedMessages: MessageData[] = approvedResponse.data;
        console.log('fetchMessages: Approved Messages:', approvedMessages);

        const convoResponse = await api.get(`/messages/conversations/${sellerId}?accountType=SELLER`);
        const conversations: Conversation[] = convoResponse.data;
        console.log('fetchMessages: Conversations:', conversations);

        const allMessages: Conversation[] = conversations.map((convo) => {
          const uniqueMessages = [
            ...convo.messages,
            ...approvedMessages.filter((msg) => msg.conversationId === convo.conversationId),
          ].reduce((acc, msg) => {
            if (!acc.some((m) => m.id === msg.id)) {
              acc.push(msg);
            }
            return acc;
          }, [] as MessageData[]);
          return { ...convo, messages: uniqueMessages };
        });
        console.log('fetchMessages: All Messages:', allMessages);

        const formattedMessages: UIMessage[] = allMessages.map((convo) => {
          const latestMessage = convo.messages[0];
          const timestamp = new Date(latestMessage.createdAt).toLocaleString('en-US', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
          });

          return {
            id: convo.conversationId,
            sender: latestMessage.sender.role === 'BUYER' ? latestMessage.sender.name : 'Super Admin',
            preview: latestMessage.content.slice(0, 30) + '...',
            timestamp: timestamp.split(',')[1].trim(),
            conversation: convo.messages.map((msg) => {
              const initials = msg.sender.name
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')
                .toUpperCase();

              return {
                id: msg.id,
                senderId: msg.sender.id,
                sender: msg.sender.role === 'SELLER' ? 'SE' : initials,
                message: msg.content,
                attachments: msg.attachments,
                time: new Date(msg.createdAt).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: 'numeric',
                }),
                delivered: msg.status === 'APPROVED',
                avatar: initials,
                pending: false,
              };
            }),
            date: timestamp.split(',')[0] + ',' + timestamp.split(',')[2],
          };
        });
        console.log('fetchMessages: Formatted Messages:', formattedMessages);

        const pendingMessagesString = Cookies.get(`pendingMessages_${sellerId}`);
        console.log('fetchMessages: Raw Pending Messages from Cookie:', pendingMessagesString);
        const pendingMessages: PendingMessage[] = pendingMessagesString ? JSON.parse(pendingMessagesString) : [];
        console.log('fetchMessages: Parsed Pending Messages:', pendingMessages);

        const mergedMessages = mergePendingMessages(formattedMessages, pendingMessages);
        console.log('fetchMessages: Merged Messages:', mergedMessages);
        setMessages(mergedMessages);
        if (mergedMessages.length > 0) setActiveMessageId(mergedMessages[0].id);
      } catch (err: unknown) { // Change from 'any' to 'unknown'
        const axiosError = err as AxiosError<{ message?: string }>;
        console.error('fetchMessages: Error:', axiosError.response?.data || axiosError.message);
        setError('Failed to load messages. Please try again.');
      } finally {
        setLoading(false);
        console.log('fetchMessages: Completed');
      }
    };

    fetchMessages();
  }, [router]);

  const mergePendingMessages = (
    fetchedMessages: UIMessage[],
    pendingMessages: PendingMessage[]
  ): UIMessage[] => {
    console.log('mergePendingMessages: Starting with fetched:', fetchedMessages);
    console.log('mergePendingMessages: Pending messages:', pendingMessages);

    const convoMap = new Map<string, UIMessage>(fetchedMessages.map((msg) => [msg.id, { ...msg }]));

    pendingMessages.forEach((pending) => {
      console.log('mergePendingMessages: Processing pending message:', pending);
      const convoId = pending.conversationId;
      if (!convoMap.has(convoId)) {
        const timestamp = new Date().toLocaleString('en-US', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          hour: 'numeric',
          minute: 'numeric',
        });
        convoMap.set(convoId, {
          id: convoId,
          sender: 'You',
          preview: pending.message.slice(0, 30) + '...',
          timestamp: timestamp.split(',')[1].trim(),
          conversation: [],
          date: timestamp.split(',')[0] + ',' + timestamp.split(',')[2],
        });
      }

      const convo = convoMap.get(convoId)!;
      const exists = convo.conversation.some((msg) => msg.id === pending.id);
      if (!exists) {
        console.log('mergePendingMessages: Adding pending message to convo:', pending);
        convo.conversation.push({
          id: pending.id,
          senderId: pending.senderId,
          sender: pending.sender,
          message: pending.message,
          time: pending.time,
          attachments: pending.attachments,
          delivered: false,
          avatar: pending.avatar,
          pending: true,
          error: pending.error || false,
        });
        const pendingTime = new Date(pending.time);
        const latestTime = convo.conversation.length > 1
          ? new Date(convo.conversation[0].time)
          : new Date(0);
        if (pendingTime > latestTime) {
          convo.preview = pending.message.slice(0, 30) + '...';
          convo.timestamp = pending.time;
        }
      }
    });

    const result = Array.from(convoMap.values());
    console.log('mergePendingMessages: Result:', result);
    return result;
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setAttachedFile(file);
  };

  const handleSendReply = async () => {
    if (!replyContent.trim() || !activeMessageId) return;

    console.log('handleSendReply: Starting');
    const accessToken = Cookies.get('accessToken');
    const sellerDataString = Cookies.get('sellerData');

    if (!accessToken || !sellerDataString) {
      console.log('handleSendReply: No tokens, redirecting');
      router.push(getLoginRedirectUrl('seller'));
      return;
    }

    let sellerId: string;
    try {
      const sellerData = JSON.parse(sellerDataString);
      sellerId = sellerData.id;
      console.log('handleSendReply: Seller ID:', sellerId);
    } catch (err) {
      console.error('handleSendReply: Error parsing seller data:', err);
      router.push(getLoginRedirectUrl('seller'));
      return;
    }

    const activeConvo = messages.find((msg) => msg.id === activeMessageId);
    if (!activeConvo) {
      console.log('handleSendReply: No active conversation found');
      return;
    }

    const buyerMessage = activeConvo.conversation.find((msg) => msg.sender !== 'SE');
    const buyerId = buyerMessage?.senderId;
    if (!buyerId) {
      console.error('handleSendReply: No buyer ID found');
      return;
    }

    messageCounter.current += 1;
    const tempId = `pending-${Date.now()}-${activeMessageId}-${messageCounter.current}`;
    const newMessage: PendingMessage = {
      id: tempId,
      senderId: sellerId,
      sender: 'SE',
      message: replyContent,
      time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric' }),
      attachments: attachedFile ? [URL.createObjectURL(attachedFile)] : undefined,
      delivered: false,
      avatar: 'SE',
      pending: true,
      conversationId: activeMessageId,
    };

    setMessages((prev) => {
      console.log('handleSendReply: Updating messages with new message:', newMessage);
      const updatedMessages = prev.map((msg) =>
        msg.id === activeMessageId
          ? {
              ...msg,
              conversation: [...msg.conversation, newMessage],
              preview: replyContent.slice(0, 30) + '...',
              timestamp: newMessage.time,
            }
          : msg
      );

      const pendingMessagesString = Cookies.get(`pendingMessages_${sellerId}`);
      const pendingMessages: PendingMessage[] = pendingMessagesString ? JSON.parse(pendingMessagesString) : [];
      const updatedPending = [...pendingMessages, newMessage];
      Cookies.set(`pendingMessages_${sellerId}`, JSON.stringify(updatedPending), {
        expires: 7,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
      });
      console.log('handleSendReply: Pending Messages Saved:', updatedPending);
      return updatedMessages;
    });

    setReplyContent('');
    setAttachedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';

    try {
      const formData = new FormData();
      formData.append('sellerId', sellerId);
      formData.append('buyerId', buyerId);
      formData.append('content', replyContent);
      formData.append('parentMessageId', activeConvo.conversation[0].id);
      if (attachedFile) formData.append('attachments', attachedFile);

      const response = await api.post('/messages/seller/respond', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      console.log('handleSendReply: Server Response:', response.data);

      setMessages((prev) => {
        const updatedMessages = prev.map((msg) =>
          msg.id === activeMessageId
            ? {
                ...msg,
                conversation: msg.conversation.map((m) =>
                  m.id === tempId
                    ? {
                        ...m,
                        id: response.data.id,
                        attachments: response.data.attachments,
                        delivered: response.data.status === 'APPROVED',
                        pending: response.data.status !== 'APPROVED',
                      }
                    : m
                ),
              }
            : msg
        );

        if (response.data.status === 'APPROVED') {
          const pendingMessagesString = Cookies.get(`pendingMessages_${sellerId}`);
          const pendingMessages: PendingMessage[] = pendingMessagesString ? JSON.parse(pendingMessagesString) : [];
          const updatedPending = pendingMessages.filter((p: PendingMessage) => p.id !== tempId);
          Cookies.set(`pendingMessages_${sellerId}`, JSON.stringify(updatedPending), {
            expires: 7,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
          });
          console.log('handleSendReply: Updated Pending After Approval:', updatedPending);
        } else {
          console.log('handleSendReply: Message still pending, not removing from cookie');
        }

        return updatedMessages;
      });
    } catch (err: unknown) { // Change from 'any' to 'unknown'
      const axiosError = err as AxiosError<{ message?: string }>;
      console.error('handleSendReply: Error:', axiosError.response?.data || axiosError.message);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === activeMessageId
            ? {
                ...msg,
                conversation: msg.conversation.map((m) =>
                  m.id === tempId ? { ...m, error: true } : m
                ),
              }
            : msg
        )
      );
    }
  };

  const handleAttachmentClick = (url: string) => {
    const extension = url.split('.').pop()?.toLowerCase();
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp'];

    if (extension && imageExtensions.includes(extension)) {
      setPreviewImage(url);
    } else {
      const link = document.createElement('a');
      link.href = url;
      link.download = url.split('/').pop() || 'document';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const closePreview = () => setPreviewImage(null);

  const activeMessage = messages.find((msg) => msg.id === activeMessageId);

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
    <div className="p-4 flex flex-col h-[calc(100vh-72px)]">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-[#011631]">Messages</h2>
        <p className="text-xs text-gray-600">Stay informed with buyer and admin updates.</p>
      </div>
      <div className="flex flex-1 space-x-4">
        <div className="w-1/4">
          <div className="max-h-[calc(100vh-10rem)] overflow-y-auto p-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                onClick={() => setActiveMessageId(msg.id)}
                className={`p-3 mb-2 rounded-md cursor-pointer shadow-md bg-white ${
                  activeMessageId === msg.id ? 'bg-gray-200' : 'hover:bg-gray-100'
                }`}
              >
                <h3 className="text-sm font-semibold text-[#011631]">{msg.sender}</h3>
                <p className="text-xs text-gray-600 truncate">{msg.preview}</p>
                <p className="text-xs text-gray-400">{msg.timestamp}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="w-3/4 bg-white rounded-lg shadow-md flex flex-col">
          {activeMessage ? (
            <>
              <div className="text-center text-xs text-gray-600 p-4 border-b border-gray-200">{activeMessage.date}</div>
              <div className="flex-1 max-h-[calc(100vh-18rem)] overflow-y-auto p-4 space-y-4">
                {activeMessage.conversation.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender === 'SE' ? 'justify-end' : 'justify-start'} items-start`}
                  >
                    <div
                      className={`max-w-xs p-3 rounded-lg shadow-md ${
                        msg.sender === 'SE' ? 'bg-[#F26E52] text-white' : 'bg-gray-100 text-gray-800'
                      } ${msg.pending ? 'opacity-75' : ''}`}
                    >
                      <p className="text-sm">{msg.message}</p>
                      {msg.attachments?.map((url, i) => (
                        <button
                          key={i}
                          onClick={() => handleAttachmentClick(url)}
                          className={`text-xs mt-2 underline ${
                            msg.sender === 'SE' ? 'text-white' : 'text-blue-500'
                          }`}
                        >
                          Attachment {i + 1}
                        </button>
                      ))}
                      <p className="text-xs mt-1 opacity-75">
                        {msg.time}{' '}
                        {msg.sender === 'SE' && (
                          <span>{msg.error ? '⚠️' : msg.delivered ? '✔✔' : '✔'}</span>
                        )}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-4 border-t border-gray-200">
                <div className="flex items-center p-3 bg-gray-100 rounded-lg shadow-md">
                  <input
                    type="text"
                    placeholder="Send your message..."
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    className="flex-1 px-4 bg-transparent text-gray-600 focus:outline-none"
                  />
                  <button onClick={() => fileInputRef.current?.click()} className="p-1">
                    <Image src="/pin.png" alt="Attach" width={20} height={20} />
                  </button>
                  {attachedFile && <p className="text-xs text-gray-500 mx-2">{attachedFile.name}</p>}
                  <button
                    onClick={handleSendReply}
                    className="p-1 ml-2"
                    disabled={!replyContent.trim()}
                  >
                    <Image src="/CTA.png" alt="Send" width={20} height={20} />
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-4">
              <Image src="/no-message.png" alt="No Messages" width={100} height={100} className="mb-6" />
              <h2 className="text-2xl font-bold text-[#011631] mb-2">No Messages Yet</h2>
              <p className="text-sm text-gray-600 text-center">
                Start a conversation or check back later for updates.
              </p>
            </div>
          )}
        </div>
      </div>

      {previewImage && (
        <div className="fixed inset-0 bg-gradient-to-br from-gray-800/50 to-gray-900/50 flex justify-center items-center z-50">
          <div className="relative max-w-3xl max-h-[80vh] overflow-auto">
            <Image
              src={previewImage}
              alt="Attachment Preview"
              width={800}
              height={600}
              className="object-contain"
            />
            <button
              onClick={closePreview}
              className="absolute top-2 right-2 bg-white text-black rounded-full p-2"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}