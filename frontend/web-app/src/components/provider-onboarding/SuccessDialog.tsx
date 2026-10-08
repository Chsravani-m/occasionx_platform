"use client";

interface SuccessDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function SuccessDialog({
  open,
  onClose,
}: SuccessDialogProps) {

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center">

      <div className="bg-white rounded-3xl shadow-2xl p-10 w-[90%] max-w-lg text-center">

        <div className="w-24 h-24 rounded-full bg-green-100 mx-auto flex items-center justify-center">
          <span className="text-6xl">
            🎉
          </span>
        </div>

        <h2 className="text-3xl font-bold mt-6 text-[#1F2937]">
          Partner Registration Successful
        </h2>

        <p className="text-gray-600 mt-4 leading-relaxed">
          Welcome to the <strong>OccasionX Partner Network</strong>.
          <br /><br />
          Your account has been created successfully.
          Complete your onboarding setup to start
          receiving bookings from customers.
        </p>

        <div className="mt-6 rounded-2xl bg-[#F8F6F2] p-5 text-left">

          <h3 className="font-semibold text-[#1F2937] mb-3">
            Next Steps
          </h3>

          <ul className="space-y-2 text-sm text-gray-600">
            <li>✓ Complete Business Profile</li>
            <li>✓ Upload Verification Documents</li>
            <li>✓ Add Portfolio</li>
            <li>✓ Configure Services</li>
            <li>✓ Setup Pricing</li>
            <li>✓ Activate Subscription</li>
          </ul>

        </div>

        <button
          onClick={onClose}
          className="
            mt-8
            w-full
            rounded-xl
            bg-[#1E3A8A]
            hover:bg-[#182E6E]
            text-white
            py-3
            font-semibold
            transition
          "
        >
          Continue Setup →
        </button>

      </div>

    </div>
  );
}