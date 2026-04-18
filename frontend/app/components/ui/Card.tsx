import React from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className = "", ...props }: CardProps) {
  return (
    <div className={`bg-white rounded-xl shadow-lg p-6 border border-slate-200 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className = "" }: CardProps) {
  return <div className={`mb-4 ${className}`}>{children}</div>;
}

export function CardTitle({ children, className = "" }: CardProps) {
  return (
    <h2 className={`text-2xl font-bold text-slate-900 ${className}`}>
      {children}
    </h2>
  );
}

export function CardDescription({ children, className = "" }: CardProps) {
  return <p className={`text-gray-600 mt-1 ${className}`}>{children}</p>;
}

export function CardContent({ children, className = "" }: CardProps) {
  return <div className={className}>{children}</div>;
}
