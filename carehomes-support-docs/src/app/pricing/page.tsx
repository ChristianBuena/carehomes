'use client';

import Link from 'next/link';

const plans = [
  {
    name: 'Basic',
    price: 300,
    description: 'Perfect for small facilities',
    features: [
      'Submit up to 5 rebuttals per month',
      'Basic support',
      'Email notifications',
      'Document upload up to 5MB',
    ],
  },
  {
    name: 'Pro',
    price: 400,
    description: 'Best for growing facilities',
    features: [
      'Submit up to 25 rebuttals per month',
      'Priority support',
      'Real-time notifications',
      'Document upload up to 20MB',
      'Custom branding',
    ],
    popular: true,
  },
  {
    name: 'Enterprise',
    price: 500,
    description: 'For large organizations',
    features: [
      'Unlimited rebuttals',
      '24/7 dedicated support',
      'Real-time notifications',
      'Document upload up to 100MB',
      'Custom branding',
      'API access',
      'Advanced analytics',
    ],
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-4">Simple, Transparent Pricing</h1>
        <p className="text-center text-gray-600 mb-12">Choose the plan that fits your needs</p>

        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`bg-white rounded-lg shadow-md p-8 ${
                plan.popular ? 'ring-2 ring-blue-600 relative' : ''
              }`}
            >
              {plan.popular && (
                <div className="absolute top-0 right-8 transform -translate-y-1/2">
                  <span className="bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-medium">
                    Most Popular
                  </span>
                </div>
              )}

              <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
              <p className="text-gray-600 mb-6">{plan.description}</p>

              <div className="mb-6">
                <span className="text-4xl font-bold">${plan.price}</span>
                <span className="text-gray-600 ml-2">/month</span>
              </div>

              <Link
                href="/auth/signup"
                className={`w-full py-2 rounded-lg font-medium text-center block mb-8 transition ${
                  plan.popular
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                }`}
              >
                Get Started
              </Link>

              <ul className="space-y-4">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start">
                    <span className="text-green-500 mr-3">✓</span>
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}