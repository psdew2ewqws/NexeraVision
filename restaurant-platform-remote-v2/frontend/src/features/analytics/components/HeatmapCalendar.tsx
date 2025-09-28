import React, { useMemo, useState } from 'react';
import { format, parseISO, eachDayOfInterval, startOfWeek, endOfWeek, isSameDay, getDay } from 'date-fns';
import { Calendar, Clock, Activity } from 'lucide-react';
import { HeatmapDataPoint } from '../../../services/analytics.service';

interface HeatmapCalendarProps {
  data?: HeatmapDataPoint[];
  isLoading?: boolean;
  height?: number;
}

interface ProcessedDataPoint {
  date: string;
  hour: number;
  orders: number;
  intensity: number;
  dayOfWeek: number;
  formattedDate: string;
  formattedHour: string;
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

const HeatmapCalendar: React.FC<HeatmapCalendarProps> = ({
  data = [],
  isLoading = false,
  height = 400
}) => {
  const [selectedView, setSelectedView] = useState<'hourly' | 'daily'>('hourly');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [hoveredCell, setHoveredCell] = useState<{ date: string; hour: number } | null>(null);

  const processedData = useMemo(() => {
    const processed: ProcessedDataPoint[] = data.map(item => ({
      ...item,
      dayOfWeek: getDay(parseISO(item.date)),
      formattedDate: format(parseISO(item.date), 'MMM dd'),
      formattedHour: format(new Date().setHours(item.hour, 0, 0, 0), 'HH:mm')
    }));

    return processed;
  }, [data]);

  const maxIntensity = useMemo(() => {
    return Math.max(...data.map(item => item.intensity), 1);
  }, [data]);

  const dailyAggregated = useMemo(() => {
    const dailyMap = new Map<string, { date: string; totalOrders: number; avgIntensity: number }>();

    processedData.forEach(item => {
      const existing = dailyMap.get(item.date) || { date: item.date, totalOrders: 0, avgIntensity: 0 };
      existing.totalOrders += item.orders;
      existing.avgIntensity = Math.max(existing.avgIntensity, item.intensity);
      dailyMap.set(item.date, existing);
    });

    return Array.from(dailyMap.values());
  }, [processedData]);

  const hourlyAggregated = useMemo(() => {
    const hourlyMap = new Map<number, { hour: number; totalOrders: number; avgIntensity: number }>();

    processedData.forEach(item => {
      const existing = hourlyMap.get(item.hour) || { hour: item.hour, totalOrders: 0, avgIntensity: 0 };
      existing.totalOrders += item.orders;
      existing.avgIntensity += item.intensity;
      hourlyMap.set(item.hour, existing);
    });

    // Calculate averages
    hourlyMap.forEach((value, key) => {
      const count = processedData.filter(item => item.hour === key).length;
      value.avgIntensity = count > 0 ? value.avgIntensity / count : 0;
    });

    return Array.from(hourlyMap.values()).sort((a, b) => a.hour - b.hour);
  }, [processedData]);

  const uniqueDates = useMemo(() => {
    return Array.from(new Set(processedData.map(item => item.date))).sort();
  }, [processedData]);

  const getIntensityColor = (intensity: number) => {
    const normalizedIntensity = intensity / maxIntensity;
    if (normalizedIntensity === 0) return 'bg-gray-100';
    if (normalizedIntensity <= 0.2) return 'bg-blue-100';
    if (normalizedIntensity <= 0.4) return 'bg-blue-200';
    if (normalizedIntensity <= 0.6) return 'bg-blue-300';
    if (normalizedIntensity <= 0.8) return 'bg-blue-400';
    return 'bg-blue-500';
  };

  const getDayIntensityColor = (totalOrders: number) => {
    const maxDailyOrders = Math.max(...dailyAggregated.map(d => d.totalOrders), 1);
    const normalizedIntensity = totalOrders / maxDailyOrders;

    if (normalizedIntensity === 0) return 'bg-gray-100';
    if (normalizedIntensity <= 0.2) return 'bg-green-100';
    if (normalizedIntensity <= 0.4) return 'bg-green-200';
    if (normalizedIntensity <= 0.6) return 'bg-green-300';
    if (normalizedIntensity <= 0.8) return 'bg-green-400';
    return 'bg-green-500';
  };

  const getDataForCell = (date: string, hour: number) => {
    return processedData.find(item => item.date === date && item.hour === hour);
  };

  const formatHour = (hour: number) => {
    return format(new Date().setHours(hour, 0, 0, 0), 'HH:mm');
  };

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="flex justify-between items-center mb-4">
          <div className="h-6 bg-gray-200 rounded w-32"></div>
          <div className="flex gap-2">
            <div className="h-8 bg-gray-200 rounded w-16"></div>
            <div className="h-8 bg-gray-200 rounded w-16"></div>
          </div>
        </div>
        <div className="h-96 bg-gray-200 rounded"></div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 text-gray-500">
        <div className="text-center">
          <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No heatmap data available</p>
          <p className="text-sm">Order density will appear once data is collected</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Controls */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600" />
            <span className="text-sm text-gray-600">
              Peak Activity: {hourlyAggregated.reduce((max, hour) =>
                hour.totalOrders > max.totalOrders ? hour : max,
                hourlyAggregated[0] || { hour: 0, totalOrders: 0 }
              )?.hour ? formatHour(hourlyAggregated.reduce((max, hour) =>
                hour.totalOrders > max.totalOrders ? hour : max,
                hourlyAggregated[0]
              ).hour) : 'N/A'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setSelectedView('hourly')}
              className={`px-3 py-1 text-sm rounded ${
                selectedView === 'hourly' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
              }`}
            >
              Hourly
            </button>
            <button
              onClick={() => setSelectedView('daily')}
              className={`px-3 py-1 text-sm rounded ${
                selectedView === 'daily' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
              }`}
            >
              Daily
            </button>
          </div>
        </div>
      </div>

      {selectedView === 'hourly' ? (
        /* Hourly Heatmap */
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="overflow-x-auto">
            <div className="min-w-full">
              {/* Hour labels */}
              <div className="flex mb-2">
                <div className="w-16 text-xs text-gray-500"></div>
                {HOURS.map(hour => (
                  <div
                    key={hour}
                    className="w-8 text-xs text-gray-500 text-center"
                    title={formatHour(hour)}
                  >
                    {hour % 6 === 0 ? formatHour(hour).split(':')[0] : ''}
                  </div>
                ))}
              </div>

              {/* Heatmap grid */}
              <div className="space-y-1">
                {uniqueDates.map(date => (
                  <div key={date} className="flex items-center">
                    <div className="w-16 text-xs text-gray-600 pr-2">
                      {format(parseISO(date), 'MMM dd')}
                    </div>
                    <div className="flex gap-1">
                      {HOURS.map(hour => {
                        const cellData = getDataForCell(date, hour);
                        const intensity = cellData?.intensity || 0;
                        const orders = cellData?.orders || 0;

                        return (
                          <div
                            key={`${date}-${hour}`}
                            className={`w-6 h-6 rounded-sm cursor-pointer transition-all duration-200 hover:scale-110 hover:ring-2 hover:ring-blue-300 ${getIntensityColor(intensity)}`}
                            title={`${format(parseISO(date), 'MMM dd')} at ${formatHour(hour)}: ${orders} orders`}
                            onMouseEnter={() => setHoveredCell({ date, hour })}
                            onMouseLeave={() => setHoveredCell(null)}
                          />
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Intensity legend */}
          <div className="flex items-center justify-center mt-4 space-x-2 text-xs text-gray-600">
            <span>Less</span>
            <div className="flex space-x-1">
              <div className="w-3 h-3 bg-gray-100 rounded-sm"></div>
              <div className="w-3 h-3 bg-blue-100 rounded-sm"></div>
              <div className="w-3 h-3 bg-blue-200 rounded-sm"></div>
              <div className="w-3 h-3 bg-blue-300 rounded-sm"></div>
              <div className="w-3 h-3 bg-blue-400 rounded-sm"></div>
              <div className="w-3 h-3 bg-blue-500 rounded-sm"></div>
            </div>
            <span>More</span>
          </div>
        </div>
      ) : (
        /* Daily Summary */
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="grid grid-cols-7 gap-2 mb-4">
            {DAYS_OF_WEEK.map(day => (
              <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {dailyAggregated.map(day => {
              const dayOfWeek = getDay(parseISO(day.date));
              return (
                <div
                  key={day.date}
                  className={`p-3 rounded-lg cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-md ${getDayIntensityColor(day.totalOrders)}`}
                  style={{ gridColumn: dayOfWeek + 1 }}
                  title={`${format(parseISO(day.date), 'MMMM dd, yyyy')}: ${day.totalOrders} orders`}
                  onClick={() => setSelectedDate(selectedDate === day.date ? null : day.date)}
                >
                  <div className="text-xs font-medium text-gray-700">
                    {format(parseISO(day.date), 'dd')}
                  </div>
                  <div className="text-xs text-gray-600">
                    {day.totalOrders}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Hover tooltip */}
      {hoveredCell && (
        <div className="fixed z-50 bg-white p-2 border border-gray-200 rounded-lg shadow-lg pointer-events-none">
          <p className="text-sm font-medium">
            {format(parseISO(hoveredCell.date), 'MMMM dd, yyyy')}
          </p>
          <p className="text-sm text-gray-600">
            {formatHour(hoveredCell.hour)} - {getDataForCell(hoveredCell.date, hoveredCell.hour)?.orders || 0} orders
          </p>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-gray-900">Peak Hour</span>
          </div>
          <div className="text-lg font-bold text-gray-900">
            {hourlyAggregated.length > 0 ? formatHour(
              hourlyAggregated.reduce((max, hour) =>
                hour.totalOrders > max.totalOrders ? hour : max,
                hourlyAggregated[0]
              ).hour
            ) : 'N/A'}
          </div>
          <div className="text-xs text-gray-500">
            {hourlyAggregated.length > 0 ? `${hourlyAggregated.reduce((max, hour) =>
              hour.totalOrders > max.totalOrders ? hour : max,
              hourlyAggregated[0]
            ).totalOrders} orders` : 'No data'}
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-gray-900">Peak Day</span>
          </div>
          <div className="text-lg font-bold text-gray-900">
            {dailyAggregated.length > 0 ? format(parseISO(
              dailyAggregated.reduce((max, day) =>
                day.totalOrders > max.totalOrders ? day : max,
                dailyAggregated[0]
              ).date
            ), 'MMM dd') : 'N/A'}
          </div>
          <div className="text-xs text-gray-500">
            {dailyAggregated.length > 0 ? `${dailyAggregated.reduce((max, day) =>
              day.totalOrders > max.totalOrders ? day : max,
              dailyAggregated[0]
            ).totalOrders} orders` : 'No data'}
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-medium text-gray-900">Total Activity</span>
          </div>
          <div className="text-lg font-bold text-gray-900">
            {processedData.reduce((sum, item) => sum + item.orders, 0).toLocaleString()}
          </div>
          <div className="text-xs text-gray-500">
            Orders in selected period
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeatmapCalendar;