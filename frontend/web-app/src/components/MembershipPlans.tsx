import React from 'react';

export type Plan = {
  label: string;
  price: number;
  cadence: 'monthly' | 'quarterly' | 'half-yearly' | 'yearly';
};

const PLANS: Plan[] = [
  { label: 'Monthly', price: 99, cadence: 'monthly' },
  { label: 'Quarterly', price: 299, cadence: 'quarterly' },
  { label: 'Half Yearly', price: 599, cadence: 'half-yearly' },
  { label: 'Yearly', price: 1199, cadence: 'yearly' },
];

interface Props {
  onSelect: (plan: Plan) => void;
}

const MembershipPlans: React.FC<Props> = ({ onSelect }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {PLANS.map((p) => (
        <div key={p.cadence} className="ox-glass p-4 flex flex-col items-start">
          <div className="text-xl font-semibold mb-2">{p.label}</div>
          <div className="text-2xl font-bold text-ox-primary">₹{p.price}</div>
          <button className="ox-btn mt-4" onClick={() => onSelect(p)}>Choose</button>
        </div>
      ))}
    </div>
  );
};

export default MembershipPlans;
