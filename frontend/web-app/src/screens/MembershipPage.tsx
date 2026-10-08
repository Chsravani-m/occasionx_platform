import React, { useState } from 'react';
import { useToast, useConfirm } from "@/context/NotificationContext";
import { useNavigate } from 'react-router-dom';

interface MembershipPlan {
  code: 'MONTHLY' | 'QUARTERLY' | 'HALF_YEARLY' | 'YEARLY';
  name: string;
  price: number;
  durationDays: number;
  description: string;
}

const PLANS: MembershipPlan[] = [
  { code: 'MONTHLY', name: 'Monthly', price: 99, durationDays: 30, description: 'Great for trying out premium features.' },
  { code: 'QUARTERLY', name: 'Quarterly', price: 299, durationDays: 90, description: 'Save versus monthly; perfect for frequent users.' },
  { code: 'HALF_YEARLY', name: 'Half-yearly', price: 599, durationDays: 180, description: 'Best value for active planners.' },
  { code: 'YEARLY', name: 'Yearly', price: 1199, durationDays: 365, description: 'Max savings and uninterrupted premium access.' },
];

// Placeholder payment initiate function (to be replaced by real API)
const initiateMembershipPayment = async (planCode: MembershipPlan['code']) => {
  // Simulate a network call delay
  await new Promise((res) => setTimeout(res, 800));
  return { success: true, paymentId: 'PAYMOCK-' + Math.floor(Math.random() * 100000) };
};

export const MembershipPage: React.FC = () => {
  const toast = useToast();
  const confirmDialog = useConfirm();
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState<MembershipPlan | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');

  const isLoggedIn = !!localStorage.getItem('accessToken');

  const onChoosePlan = async (plan: MembershipPlan) => {
    setSelectedPlan(plan);
    setMessage('');
    if (!isLoggedIn) {
      toast.error('Please login to upgrade');
      navigate('/login');
      return;
    }
    setLoading(true);
    try {
      const initRes = await initiateMembershipPayment(plan.code);
      if (!initRes.success) {
        throw new Error('Failed to initiate payment');
      }
      // Simulate payment success and verification
      setTimeout(() => {
        setLoading(false);
        setMessage('Membership activated. Enjoy premium benefits!');
        // Optionally mark premium in local storage for demo
        localStorage.setItem('isPremium', 'true');
      }, 1000);
    } catch (e: any) {
      setLoading(false);
      setMessage(e?.message || 'Payment failed. Please try again.');
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold">Upgrade to OccasionXplore Premium</h1>
        <p className="opacity-80">Book instantly, access exclusive offers, and prioritize support.</p>
      </div>

      {message && (
        <div className="ox-section ox-card p-4 mb-4">{message}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {PLANS.map((plan) => (
          <div key={plan.code} className="ox-section ox-card p-6 hover:bg-white/10 transition">
            <div className="flex items-baseline justify-between">
              <h2 className="text-xl font-medium">{plan.name}</h2>
              <span className="text-lg font-semibold">₹{plan.price}</span>
            </div>
            <div className="text-sm opacity-80">Valid for {plan.durationDays} days</div>
            <ul className="mt-3 text-sm list-disc pl-5 space-y-1">
              <li>Priority support</li>
              <li>Exclusive deals and offers</li>
              <li>Instant booking access</li>
              <li>{plan.description}</li>
            </ul>
            <div className="mt-4">
              <button
                className="ox-btn"
                disabled={loading}
                onClick={() => onChoosePlan(plan)}
              >
                {loading && selectedPlan?.code === plan.code ? 'Processing…' : 'Choose Plan'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Premium badge demo */}
      {localStorage.getItem('isPremium') === 'true' ? (
        <div className="mt-6">
          <span className="ox-tag ox-tag-status--confirmed">You are Premium</span>
        </div>
      ) : null}
    </div>
  );
}
