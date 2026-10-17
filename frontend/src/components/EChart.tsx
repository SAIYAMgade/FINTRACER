import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

interface EChartProps {
  option: echarts.EChartsOption;
  style?: React.CSSProperties;
  className?: string;
}

export const EChart: React.FC<EChartProps> = ({ option, style, className }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current, 'dark', {
        renderer: 'svg',
      });
    }

    const defaultDarkThemeOption: echarts.EChartsOption = {
      backgroundColor: 'transparent',
      textStyle: {
        fontFamily: 'Inter, system-ui, sans-serif',
      },
      ...option,
    };

    chartInstance.current.setOption(defaultDarkThemeOption, true);

    const handleResize = () => {
      chartInstance.current?.resize();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [option]);

  useEffect(() => {
    return () => {
      chartInstance.current?.dispose();
      chartInstance.current = null;
    };
  }, []);

  return (
    <div
      ref={chartRef}
      style={{ width: '100%', height: '320px', ...style }}
      className={className}
    />
  );
};
