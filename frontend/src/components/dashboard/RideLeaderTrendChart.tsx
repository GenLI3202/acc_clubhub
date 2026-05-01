import {
    Chart,
    Legend,
    LineController,
    LineElement,
    LinearScale,
    PointElement,
    Tooltip,
} from "chart.js";
import type { ChartConfiguration, Plugin } from "chart.js";
import { useEffect, useMemo, useRef } from "preact/hooks";
import type { VNode } from "preact";
import "./RideLeaderTrendChart.css";

Chart.register(
    Legend,
    LineController,
    LineElement,
    LinearScale,
    PointElement,
    Tooltip,
);

interface RideLeaderTrendPoint {
    event_date: string | null;
    cumulative_km: number;
    credit_km?: number;
}

interface RideLeaderTrendLeader {
    leader_name: string;
    total_credited_km?: number;
    progress?: RideLeaderTrendPoint[];
}

interface RideLeaderTrendChartProps {
    leaders: RideLeaderTrendLeader[];
    selectedLeader?: string;
    year: number;
}

const PALETTE = [
    "#2563eb",
    "#f97316",
    "#16a34a",
    "#9333ea",
    "#dc2626",
    "#0891b2",
    "#ca8a04",
    "#be185d",
];

const LINE_DASHES = [
    [],
    [6, 3],
    [2, 3],
    [8, 3, 2, 3],
    [10, 4],
    [3, 2, 3, 6],
    [1, 4],
    [7, 2, 2, 2],
];

const POINT_STYLES = [
    "circle",
    "rectRounded",
    "triangle",
    "rectRot",
    "crossRot",
    "star",
    "rect",
    "dash",
] as const;

function format_km(value: number | null | undefined): string {
    if (value == null || Number.isNaN(value)) {
        return "-";
    }
    return `${Number(value).toFixed(1)} km`;
}

function format_date(value: number | string | null | undefined): string {
    if (value == null) {
        return "-";
    }
    return new Date(value).toLocaleDateString("en-GB", {
        month: "short",
        day: "numeric",
    });
}

function make_threshold_plugin(): Plugin<"line"> {
    return {
        id: "rideLeaderThresholds",
        afterDatasetsDraw(chart) {
            const { ctx, chartArea, scales } = chart;
            const yScale = scales.y;
            if (!yScale || !chartArea) {
                return;
            }

            [
                { value: 300, label: "300 km threshold", color: "#cf222e" },
                { value: 320, label: "320 km target", color: "#9a6700" },
            ].forEach((line) => {
                const y = yScale.getPixelForValue(line.value);
                if (y < chartArea.top || y > chartArea.bottom) {
                    return;
                }

                ctx.save();
                ctx.beginPath();
                ctx.setLineDash([2, 4]);
                ctx.lineWidth = 1;
                ctx.strokeStyle = line.color;
                ctx.moveTo(chartArea.left, y);
                ctx.lineTo(chartArea.right, y);
                ctx.stroke();

                ctx.setLineDash([]);
                ctx.fillStyle = line.color;
                ctx.font = [
                    "600 12px -apple-system",
                    "BlinkMacSystemFont",
                    "Segoe UI",
                    "sans-serif",
                ].join(", ");
                ctx.textAlign = "right";
                ctx.fillText(line.label, chartArea.right - 8, y - 8);
                ctx.restore();
            });
        },
    };
}

export function RideLeaderTrendChart({
    leaders,
    selectedLeader,
    year,
}: RideLeaderTrendChartProps): VNode {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const chartRef = useRef<Chart<"line"> | null>(null);

    const series = useMemo(() => {
        return leaders.map((leader, index) => {
            const points = (leader.progress ?? [])
                .map((point) => {
                    const time = point.event_date
                        ? new Date(point.event_date).getTime()
                        : Number.NaN;
                    return {
                        x: time,
                        y: Number(point.cumulative_km ?? 0),
                        credit_km: point.credit_km,
                    };
                })
                .filter((point) => Number.isFinite(point.x))
                .sort((a, b) => a.x - b.x);

            return {
                leader,
                color: PALETTE[index % PALETTE.length],
                lineDash: LINE_DASHES[index % LINE_DASHES.length],
                pointStyle: POINT_STYLES[index % POINT_STYLES.length],
                points,
            };
        });
    }, [leaders]);

    const allPoints = series.flatMap((item) => item.points);
    const hasData = allPoints.length > 0;

    useEffect(() => {
        if (!canvasRef.current || !hasData) {
            return;
        }

        const minDate = Math.min(...allPoints.map((point) => point.x));
        const maxDate = Math.max(...allPoints.map((point) => point.x));
        const rawMaxKm = Math.max(320, ...allPoints.map((point) => point.y), 1);
        const maxKm = Math.ceil(rawMaxKm / 50) * 50;
        const datePadding = Math.max(
            (maxDate - minDate) * 0.04,
            24 * 60 * 60 * 1000,
        );
        const ctx = canvasRef.current.getContext("2d");
        if (!ctx) {
            return;
        }

        const config: ChartConfiguration<"line"> = {
            type: "line",
            data: {
                datasets: series.map((item) => {
                    const isSelected = item.leader.leader_name === selectedLeader;
                    return {
                        label: item.leader.leader_name,
                        data: item.points,
                        borderColor: item.color,
                        backgroundColor: item.color,
                        borderDash: item.lineDash,
                        borderWidth: isSelected ? 4 : 2,
                        pointRadius: isSelected ? 5.5 : 4,
                        pointHoverRadius: 7,
                        pointBorderColor: "#ffffff",
                        pointBorderWidth: 2,
                        pointStyle: item.pointStyle,
                        tension: 0.22,
                    };
                }),
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: "nearest",
                },
                layout: {
                    padding: {
                        top: 14,
                        right: 12,
                        bottom: 2,
                    },
                },
                plugins: {
                    legend: {
                        position: "bottom",
                        align: "center",
                        labels: {
                            boxHeight: 8,
                            boxWidth: 8,
                            color: "#24292f",
                            font: {
                                size: 12,
                                weight: 600,
                            },
                            padding: 18,
                            pointStyle: "circle",
                            usePointStyle: true,
                        },
                    },
                    tooltip: {
                        backgroundColor: "#24292f",
                        borderColor: "#d0d7de",
                        borderWidth: 1,
                        padding: 10,
                        displayColors: true,
                        callbacks: {
                            title(items) {
                                return format_date(items[0]?.parsed.x);
                            },
                            label(item) {
                                return [
                                    item.dataset.label,
                                    format_km(item.parsed.y),
                                ].join(": ");
                            },
                            afterLabel(item) {
                                const raw = item.raw as { credit_km?: number };
                                return raw.credit_km != null
                                    ? `Event credit: ${format_km(raw.credit_km)}`
                                    : "";
                            },
                        },
                    },
                },
                scales: {
                    x: {
                        type: "linear",
                        min: minDate - datePadding,
                        max: maxDate + datePadding,
                        grid: {
                            color: "#eef1f5",
                            drawTicks: false,
                        },
                        border: {
                            color: "#d8dee4",
                        },
                        ticks: {
                            color: "#57606a",
                            maxTicksLimit: 6,
                            callback(value) {
                                return format_date(Number(value));
                            },
                        },
                    },
                    y: {
                        beginAtZero: true,
                        max: maxKm,
                        grid: {
                            color: "#eef1f5",
                        },
                        border: {
                            color: "#d8dee4",
                        },
                        ticks: {
                            color: "#57606a",
                            callback(value) {
                                return `${value} km`;
                            },
                        },
                    },
                },
            },
            plugins: [make_threshold_plugin()],
        };

        chartRef.current?.destroy();
        chartRef.current = new Chart(ctx, config);

        return () => {
            chartRef.current?.destroy();
            chartRef.current = null;
        };
    }, [allPoints, hasData, selectedLeader, series]);

    if (!hasData) {
        return (
            <div className="leader-trend-empty">
                No ride leader credits recorded for {year} yet.
            </div>
        );
    }

    return (
        <div className="leader-trend-chart">
            <canvas
                ref={canvasRef}
                aria-label="All ride leaders cumulative credit trend by event date"
                role="img"
            />
        </div>
    );
}
