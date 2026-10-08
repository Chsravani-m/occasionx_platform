"use client";

import React from "react";

interface FormFieldProps {
  label: string;
  name: string;
  value: string;
  placeholder?: string;
  type?: string;
  required?: boolean;
  onChange: (
    e: React.ChangeEvent<HTMLInputElement>
  ) => void;
}

export default function FormField({
  label,
  name,
  value,
  placeholder,
  type = "text",
  required = false,
  onChange,
}: FormFieldProps) {
  return (
    <div className="flex flex-col gap-2">

      <label
        htmlFor={name}
        className="text-sm font-semibold text-[#1F2937]"
      >
        {label}
        {required && (
          <span className="text-red-500 ml-1">*</span>
        )}
      </label>

      <input
        id={name}
        name={name}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={onChange}
        required={required}
        autoComplete="off"
        className="
          w-full
          rounded-xl
          border
          border-[#E5E7EB]
          bg-[#FFFCF8]
          px-4
          py-3
          text-[#1F2937]
          placeholder:text-gray-400
          transition-all
          duration-200
          focus:outline-none
          focus:ring-2
          focus:ring-[#1E3A8A]
          focus:border-[#1E3A8A]
        "
      />
    </div>
  );
}