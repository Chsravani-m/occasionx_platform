"use client";

interface ProgressBarProps {
  currentStep: number;
}

export default function ProgressBar({
  currentStep,
}: ProgressBarProps) {
  return (
    <div className="w-full mb-10">

      <div className="flex items-center justify-between">

        {/* Step 1 */}
        <div className="flex flex-col items-center w-1/2">

          <div
            className={`
              w-12
              h-12
              rounded-full
              flex
              items-center
              justify-center
              font-semibold
              transition-all
              duration-300
              ${
                currentStep >= 1
                  ? "bg-[#1E3A8A] text-white"
                  : "bg-gray-200 text-gray-500"
              }
            `}
          >
            1
          </div>

          <p className="mt-3 text-sm font-medium text-gray-700">
            Account
          </p>

        </div>

        {/* Line */}

        <div className="flex-1 h-1 bg-gray-200 relative">

          <div
            className="
              absolute
              top-0
              left-0
              h-1
              bg-[#1E3A8A]
              transition-all
              duration-500
            "
            style={{
              width:
                currentStep === 2
                  ? "100%"
                  : "0%",
            }}
          />

        </div>

        {/* Step 2 */}

        <div className="flex flex-col items-center w-1/2">

          <div
            className={`
              w-12
              h-12
              rounded-full
              flex
              items-center
              justify-center
              font-semibold
              transition-all
              duration-300
              ${
                currentStep >= 2
                  ? "bg-[#1E3A8A] text-white"
                  : "bg-gray-200 text-gray-500"
              }
            `}
            >
            2
          </div>

          <p className="mt-3 text-sm font-medium text-gray-700">
            Business
          </p>

        </div>

      </div>

    </div>
  );
}