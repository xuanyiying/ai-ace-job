import type { ThemeConfig } from 'antd';

export const theme: ThemeConfig = {
  token: {
    colorPrimary: '#615ced',
    colorSuccess: '#52c41a',
    colorWarning: '#faad14',
    colorError: '#f5222d',
    colorInfo: '#1890ff',
    borderRadius: 6,
    fontSize: 14,
  },
  components: {
    Layout: {
      headerBg: '#001529',
      headerColor: '#fff',
    },
    Menu: {
      itemSelectedBg: '#e6f7ff',
      itemSelectedColor: '#1890ff',
    },
  },
};
