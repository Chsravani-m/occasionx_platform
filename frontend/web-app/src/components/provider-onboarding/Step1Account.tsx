"use client";

import FormField from "./FormField";
import { useState } from "react";

export interface Step1AccountValues {
  business_name: string;
  owner_name: string;
  email: string;
  phone: string;
  password: string;
  confirm_password: string;
  gst_number: string;
}

interface Step1AccountProps {
  values: Step1AccountValues;
  onChange: (
    e: React.ChangeEvent<HTMLInputElement>
  ) => void;
  onNext: () => void;
}

export default function Step1Account({
  values,
  onChange,
  onNext,
}: Step1AccountProps) {

  const [error, setError] = useState("");
  
  const validate = () => {
    setError("");
  if (
    !values.business_name.trim() ||
    !values.owner_name.trim() ||
    !values.email.trim() ||
    !values.phone.trim() ||
    !values.password.trim()
  ) {
    setError("Please fill all required fields.");
    return;
  }

  const emailRegex =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(values.email)) {
    setError("Please enter a valid email address.");
    return;
  }

  const phoneRegex =
    /^[6-9]\d{9}$/;

  if (!phoneRegex.test(values.phone)) {
    setError(
      "Please enter a valid 10-digit mobile number."
    );
    return;
  }

  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&^#()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;

  if (!passwordRegex.test(values.password)) {
    setError(
      "Password must contain at least 8 characters, one uppercase letter, one lowercase letter, one number, and one special character."
    );
    return;
  }
  if (
  values.password !==
  values.confirm_password
) {
  setError(
    "Password and Confirm Password do not match."
  );
  return;
}
  setError("");
  onNext();
};

const passwordChecks = {
  length: values.password.length >= 8,
  uppercase: /[A-Z]/.test(values.password),
  lowercase: /[a-z]/.test(values.password),
  number: /\d/.test(values.password),
  special:
    /[@$!%*?&^#()_+\-=[\]{};':"\\|,.<>/?]/.test(
      values.password
    ),
};
const strength =
  Object.values(passwordChecks).filter(Boolean)
    .length;

    const handleFieldChange = (
  e: React.ChangeEvent<HTMLInputElement>
) => {
  setError("");
  onChange(e);
};

  return (

    <div
      className="
        bg-white
        rounded-3xl
        shadow-xl
        p-10
        animate-fade-in
      "
    >

      <div className="mb-10">

        <h2 className="text-3xl font-bold text-[#1F2937]">
          Account Information
        </h2>

        <p className="text-gray-500 mt-2">
          Tell us about yourself and your business.
        </p>
        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">

        <FormField
          label="Business Name"
          name="business_name"
          value={values.business_name}
          placeholder="Business Name"
          required
          onChange={handleFieldChange}
        />

        <FormField
          label="Owner Name"
          name="owner_name"
          value={values.owner_name}
          placeholder="Owner Name"
          required
          onChange={handleFieldChange}
        />

        <FormField
          label="Business Email"
          name="email"
          type="email"
          value={values.email}
          placeholder="business@email.com"
          required
          onChange={handleFieldChange}
          
        />
        
        <FormField
          label="Phone Number"
          name="phone"
          value={values.phone}
          placeholder="+91 XXXXX XXXXX"
          required
          onChange={handleFieldChange}
        />

        <FormField
          label="Create Password"
          name="password"
          type="password"
          value={values.password}
          placeholder="Minimum 8 characters"
          required
          onChange={handleFieldChange}
        />

        <FormField
          label="Confirm Password"
          name="confirm_password"
          type="password"
          value={values.confirm_password}
          placeholder="Re-enter Password"
          required
          onChange={handleFieldChange}
        />
        <div className="md:col-span-2">

  <div className="rounded-2xl bg-[#F8F6F2] p-4">

    <h4 className="font-semibold text-sm mb-3">
      Password Requirements
    </h4>

    <div className="grid md:grid-cols-2 gap-2 text-sm">

        <div
          className={
            passwordChecks.length
              ? "text-green-600"
              : "text-gray-500"
          }
        >
          {passwordChecks.length ? "✓" : "○"} 8+
          Characters
        </div>

        <div
          className={
            passwordChecks.uppercase
              ? "text-green-600"
              : "text-gray-500"
          }
        >
          {passwordChecks.uppercase ? "✓" : "○"} Uppercase
          Letter
        </div>

        <div
          className={
            passwordChecks.lowercase
              ? "text-green-600"
              : "text-gray-500"
          }
        >
          {passwordChecks.lowercase ? "✓" : "○"} Lowercase
          Letter
        </div>

        <div
          className={
            passwordChecks.number
              ? "text-green-600"
              : "text-gray-500"
          }
        >
          {passwordChecks.number ? "✓" : "○"} Number
        </div>

        <div
          className={
            passwordChecks.special
              ? "text-green-600"
              : "text-gray-500"
          }
        >
          {passwordChecks.special ? "✓" : "○"} Special
          Character
        </div>

      </div>


      <div className="mt-4">

      <div className="h-2 rounded-full bg-gray-200">

        <div
          className="h-2 rounded-full bg-[#1E3A8A] transition-all"
          style={{
            width: `${strength * 20}%`,
          }}
        />

      </div>

      <p className="text-xs text-gray-500 mt-2">
        Password Strength: {strength}/5
      </p>
    </div>

    </div>
  </div>
        <FormField
          label="GST Number"
          name="gst_number"
          value={values.gst_number}
          placeholder="Optional"
          onChange={handleFieldChange}
        />

      </div>

      <div className="flex justify-end mt-10">

        <button
          type="button"
          onClick={validate}
          className="
            px-10
            py-3
            rounded-xl
            bg-gradient-to-r
            from-[#1E3A8A]
            to-[#182E6E]
            text-white
            font-semibold
            shadow-lg
            hover:shadow-xl
            hover:scale-105
            transition-all
          "
        >
          Continue →
        </button>

      </div>

    </div>

  );
}