import React, { useState, useEffect } from 'react';
import { Layout, Button, Drawer, Avatar } from 'antd';
import { Outlet } from 'react-router-dom';
import {
  MenuUnfoldOutlined,
  MenuFoldOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '@/stores';
import CookieConsent from '../components/CookieConsent';
import Sidebar from './components/Sidebar';
import { useTranslation } from 'react-i18next';
import './AppLayout.css';

const { Header, Sider, Content } = Layout;

const AppLayout: React.FC = () => {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const { user } = useAuthStore();
  const { t } = useTranslation();

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        // Focus search in sidebar if needed, or global command palette
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <Layout className="app-layout min-h-screen bg-transparent">
      {/* Mobile Header */}
      <Header className="mobile-header flex md:hidden items-center justify-between px-4 h-16 bg-glass border-b border-glass-border fixed w-full z-50">
        <div className="flex items-center gap-4">
          <Button
            type="text"
            icon={
              mobileDrawerOpen ? <MenuFoldOutlined /> : <MenuUnfoldOutlined />
            }
            onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          />
          <span className="font-bold text-lg text-[var(--text-primary)]">
            {t('common.app_name')}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Avatar
            size="small"
            src={user?.avatar}
            icon={<UserOutlined />}
            className="bg-primary/20 text-primary border border-primary/30"
          />
        </div>
      </Header>

      {/* Desktop Sidebar */}
      <Sider
        width={280}
        collapsedWidth={80}
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        trigger={null}
        className="hidden md:block border-r border-glass-border h-screen fixed left-0 top-0 z-20"
        style={{
          background: 'var(--bg-card)',
          backdropFilter: 'var(--glass-backdrop)',
        }}
      >
        <Sidebar isCollapsed={collapsed} />

        {/* Collapse Toggle at bottom, customized */}
        <div className="absolute bottom-4 right-[-12px] z-50">
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center cursor-pointer transition-colors shadow-lg text-xs"
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              border: '1px solid var(--glass-border)',
              color: 'var(--text-secondary)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--primary-color)';
              e.currentTarget.style.color = '#fff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
              e.currentTarget.style.color = 'var(--text-secondary)';
            }}
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          </div>
        </div>
      </Sider>

      {/* Mobile Sidebar Drawer */}
      <Drawer
        placement="left"
        onClose={() => setMobileDrawerOpen(false)}
        open={mobileDrawerOpen}
        styles={{ body: { padding: 0, background: 'transparent' } }}
        width={280}
        closable={false}
      >
        <Sidebar
          isCollapsed={false}
          setMobileDrawerOpen={setMobileDrawerOpen}
        />
      </Drawer>

      {/* Main Content Area */}
      <Layout
        className={`transition-all duration-300 ease-in-out bg-transparent flex flex-col min-h-screen
          ${collapsed ? 'md:pl-[80px]' : 'md:pl-[280px]'} 
          pt-16 md:pt-0
        `}
      >
        <Content className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-6 lg:p-8 animate-fade-in relative z-10">
          <Outlet />
        </Content>
      </Layout>

      <CookieConsent />
    </Layout>
  );
};

export default AppLayout;
