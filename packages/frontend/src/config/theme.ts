import type { ThemeConfig } from 'antd';
import { theme as antTheme } from 'antd';

// Shared tokens between themes
const sharedTokens = {
  borderRadius: 8,
  borderRadiusLG: 12,
  borderRadiusSM: 4,
  fontFamily:
    "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  fontSize: 14,
};

export const darkTheme: ThemeConfig = {
  algorithm: antTheme.darkAlgorithm,
  token: {
    ...sharedTokens,
    colorPrimary: '#6366f1', // Indigo-500
    colorSuccess: '#10b981',
    colorWarning: '#f59e0b',
    colorError: '#ef4444',
    colorInfo: '#3b82f6',

    // Backgrounds
    colorBgBase: '#030712', // Very dark slate
    colorBgContainer: '#0f172a', // Slate 900
    colorBgElevated: '#1e293b', // Slate 800

    // Text
    colorText: '#f8fafc',
    colorTextSecondary: '#94a3b8',
    colorTextTertiary: '#64748b',

    // Borders
    colorBorder: 'rgba(255, 255, 255, 0.08)',
    colorBorderSecondary: 'rgba(255, 255, 255, 0.05)',
  },
  components: {
    Layout: {
      bodyBg: '#030712',
      headerBg: 'rgba(3, 7, 18, 0.7)',
      headerPadding: '0 24px',
      siderBg: '#030712',
    },
    Menu: {
      itemBg: 'transparent',
      itemColor: '#94a3b8',
      itemSelectedColor: '#fff',
      itemSelectedBg: 'rgba(99, 102, 241, 0.15)',
      itemHoverBg: 'rgba(255, 255, 255, 0.05)',
      activeBarBorderWidth: 0,
      activeBarHeight: 0,
    },
    Button: {
      primaryShadow: '0 4px 14px 0 rgba(99, 102, 241, 0.3)',
      defaultBg: 'rgba(255, 255, 255, 0.02)',
      defaultBorderColor: 'rgba(255, 255, 255, 0.08)',
      defaultColor: '#f8fafc',
    },
    Card: {
      colorBgContainer: 'rgba(15, 23, 42, 0.6)',
      colorBorderSecondary: 'rgba(255, 255, 255, 0.05)',
    },
    Modal: {
      contentBg: '#0f172a',
      headerBg: '#0f172a',
    },
    Drawer: {
      colorBgElevated: '#030712',
    },
  },
};

export const lightTheme: ThemeConfig = {
  algorithm: antTheme.defaultAlgorithm,
  token: {
    ...sharedTokens,
    colorPrimary: '#4f46e5', // Indigo-600
    colorSuccess: '#059669',
    colorWarning: '#d97706',
    colorError: '#dc2626',
    colorInfo: '#2563eb',

    // Backgrounds
    colorBgBase: '#f8fafc', // Slate 50
    colorBgContainer: '#ffffff',
    colorBgElevated: '#ffffff',

    // Text
    colorText: '#0f172a', // Slate 900
    colorTextSecondary: '#475569', // Slate 600
    colorTextTertiary: '#94a3b8', // Slate 400

    // Borders
    colorBorder: 'rgba(0, 0, 0, 0.06)',
    colorBorderSecondary: 'rgba(0, 0, 0, 0.03)',
  },
  components: {
    Layout: {
      bodyBg: '#f8fafc',
      headerBg: 'rgba(248, 250, 252, 0.7)',
      headerPadding: '0 24px',
      siderBg: '#ffffff',
    },
    Menu: {
      itemBg: 'transparent',
      itemColor: '#475569',
      itemSelectedColor: '#4f46e5',
      itemSelectedBg: 'rgba(79, 70, 229, 0.08)',
      itemHoverBg: 'rgba(0, 0, 0, 0.02)',
      activeBarBorderWidth: 0,
      activeBarHeight: 0,
    },
    Button: {
      primaryShadow: '0 4px 14px 0 rgba(79, 70, 229, 0.2)',
      defaultBg: '#ffffff',
      defaultBorderColor: 'rgba(0, 0, 0, 0.08)',
      defaultColor: '#0f172a',
    },
    Card: {
      colorBgContainer: '#ffffff',
      colorBorderSecondary: 'rgba(0, 0, 0, 0.05)',
    },
    Modal: {
      contentBg: '#ffffff',
      headerBg: '#ffffff',
    },
    Drawer: {
      colorBgElevated: '#ffffff',
    },
  },
};

// Deprecated: keeping it for compatibility during transition if needed
export const theme = darkTheme;
