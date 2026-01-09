import React from 'react';
import { ConfigProvider } from 'antd';
import { RouterProvider } from 'react-router-dom';
import zhCN from 'antd/locale/zh_CN';
import { router } from './router';
import { lightTheme, darkTheme } from './config/theme';
import { useTranslation } from 'react-i18next';
import enUS from 'antd/locale/en_US';
import { useUIStore } from '@/stores';

function App() {
  const { i18n } = useTranslation();
  const { theme } = useUIStore();
  const currentLocale = i18n.language.startsWith('en') ? enUS : zhCN;

  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <ConfigProvider
      locale={currentLocale}
      theme={theme === 'light' ? lightTheme : darkTheme}
    >
      <RouterProvider router={router} />
    </ConfigProvider>
  );
}

export default App;
