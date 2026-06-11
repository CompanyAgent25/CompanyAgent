"use client";

import { clsx } from "clsx";

interface KPICardProps {
  title: string;
  value: string | number;
  change?: string;
  trend?: "up" | "down" | "neutral";
  icon: React.ReactNode;
}

export function KPICard({ title, value, change, trend = "neutral", icon }: KPICardProps) {
  return (
    <div className="card flex items-start justify-between">
      <div>
        <p className="text-sm text-gray-500">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        {change && (
          <p
            className={clsx(
              "text-xs mt-2 font-medium",
              trend === "up" && "text-green-600",
              trend === "down" && "text-red-600",
              trend === "neutral" && "text-gray-500"
            )}
          >
            {change}
          </p>
        )}
      </div>
      <div className="p-3 bg-brand-50 rounded-lg text-brand-600">{icon}</div>
    </div>
  );
}
