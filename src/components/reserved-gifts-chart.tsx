"use client";

import {
  ArcElement,
  Chart as ChartJS,
  type ChartData,
  type ChartOptions,
  Legend,
  Tooltip,
} from "chart.js";
import { Doughnut } from "react-chartjs-2";

ChartJS.register(ArcElement, Tooltip, Legend);

type ReservedGiftsChartProps = {
  reserved: number;
  total: number;
};

export function ReservedGiftsChart({
  reserved,
  total,
}: ReservedGiftsChartProps) {
  const safeTotal = Math.max(total, 0);
  const safeReserved = Math.min(Math.max(reserved, 0), safeTotal);
  const free = safeTotal - safeReserved;
  const reservedPercentage =
    safeTotal === 0 ? 0 : Math.round((safeReserved / safeTotal) * 100);

  const data: ChartData<"doughnut"> = {
    labels: ["Reservado", "Livre"],
    datasets: [
      {
        data: [safeReserved, free],
        backgroundColor: ["#636B2F", "#ced6c0"],
        borderWidth: 0,
      },
    ],
  };

  const options: ChartOptions<"doughnut"> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "72%",
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        enabled: true,
      },
    },
  };

  return (
    <div className="mt-8 flex-col justify-center justify-items-center">
      <div className="pointer-events-none grid place-items-center rounded-full bg-[var(--color-paper)] text-center mb-5">
        <p className="text-2xl font-semibold text-[#2d3421]">{reservedPercentage}%</p>
        <p className="text-xs tracking-[0.12em] text-[#737b69] uppercase">
          Confirmados
        </p>
      </div>      
      <div className="relative size-36">
        <Doughnut data={data} options={options} />
      </div>
    </div>
  );
}
