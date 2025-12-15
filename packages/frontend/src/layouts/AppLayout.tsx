import React, { useState, useEffect } from 'react';
import {
  Layout,
  Avatar,
  Dropdown,
  Button,
  theme,
  Modal,
  Tooltip,
  Drawer,
  message,
} from 'antd';
import type { MenuProps } from 'antd';
import { useNavigate, Outlet } from 'react-router-dom';
import {
  UserOutlined,
  SettingOutlined,
  LogoutOutlined,
  MenuUnfoldOutlined,
  MenuFoldOutlined,
  DollarOutlined,
  PlusOutlined,
  MessageOutlined,
  EditOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../stores/authStore';
import { useConversationStore } from '../stores/conversationStore';
import CookieConsent from '../components/CookieConsent';
import './AppLayout.css';

const { Header, Sider, Content } = Layout;

const AppLayout: React.FC = () => {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const { user, clearAuth } = useAuthStore();
  const { 
    conversations, 
    currentConversation, 
    deleteConversation, 
    loadConversations, 
    createConversation,
    setCurrentConversation,
    switchConversation
  } = useConversationStore();
  const navigate = useNavigate();
  const {
    token: { colorBgContainer, colorBorderSecondary },
  } = theme.useToken();

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const handleLogout = () => {
    Modal.confirm({
      title: '确认退出',
      content: '您确定要退出登录吗？',
      okText: '确定',
      cancelText: '取消',
      onOk: () => {
        clearAuth();
        navigate('/login');
      },
    });
  };

  const handleNewChat = async () => {
    try {
      const conversation = await createConversation();
      navigate('/chat');
      // If we are already on chat page, we might need to handle state update there
      // but store should handle it
    } catch (error) {
      message.error('创建新对话失败');
    }
  };

  const handleDeleteChat = (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    Modal.confirm({
      title: '删除对话',
      content: '确定要删除这个对话吗？',
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        const hide = message.loading('正在删除...', 0);
        try {
          await deleteConversation(chatId);
          hide();
          message.success('删除成功');
          if (currentConversation?.id === chatId) {
            navigate('/chat'); // Or stay on chat but empty
          }
        } catch (error) {
          hide();
          message.error('删除失败');
        }
      },
    });
  };

  const handleSelectChat = async (chatId: string) => {
    if (currentConversation?.id === chatId) return;
    try {
      await switchConversation(chatId);
      setMobileDrawerOpen(false);
      navigate('/chat');
    } catch (error) {
      message.error('切换对话失败');
    }
  };


  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    if (key === 'profile') {
      navigate('/profile');
    } else if (key === 'settings') {
      navigate('/settings');
    } else if (key === 'logout') {
      handleLogout();
    }
  };

  const userMenu: MenuProps['items'] = [
    {
      key: 'profile',
      label: '个人中心',
      icon: <UserOutlined />,
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Settings',
      onClick: () => navigate('/settings'),
    },
    {
      key: 'pricing',
      icon: <DollarOutlined />,
      label: 'Pricing',
      onClick: () => navigate('/pricing'),
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      label: '退出登录',
      icon: <LogoutOutlined />,
    },
  ];

  // Sidebar content component (shared between desktop and mobile)
  const SidebarContent = () => (
    <>
      {/* New Chat Button */}
      <div style={{ padding: '16px 12px' }}>
        <Button
          type="primary"
          block
          icon={<PlusOutlined />}
          onClick={handleNewChat}
          style={{
            height: '44px',
            borderRadius: '8px',
            fontSize: '15px',
            fontWeight: 500,
          }}
        >
          新对话
        </Button>
      </div>

      {/* History List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px' }}>
        <div
          style={{
            fontSize: '12px',
            color: '#888',
            marginBottom: '12px',
            paddingLeft: '12px',
            fontWeight: 500,
          }}
        >
          历史会话
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {conversations.map((item) => (
            <div
              key={item.id}
              onClick={() => handleSelectChat(item.id)}
              style={{
                padding: '12px',
                borderRadius: '8px',
                cursor: 'pointer',
                background:
                  currentConversation?.id === item.id ? '#f0f0f0' : 'transparent',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                position: 'relative',
                overflow: 'hidden',
              }}
              onMouseEnter={(e) => {
                if (currentConversation?.id !== item.id) {
                  e.currentTarget.style.background = '#fafafa';
                }
              }}
              onMouseLeave={(e) => {
                if (currentConversation?.id !== item.id) {
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '4px',
                  }}
                >
                  <MessageOutlined
                    style={{ fontSize: '14px', color: '#666' }}
                  />
                  <span
                    style={{
                      fontSize: '14px',
                      fontWeight: 500,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {item.title || '新对话'}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: '12px',
                    color: '#999',
                    paddingLeft: '22px',
                  }}
                >
                  {new Date(item.updatedAt).toLocaleDateString()}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '4px', opacity: 0.6 }}>
                <Tooltip title="重命名">
                  <Button
                    type="text"
                    size="small"
                    icon={<EditOutlined />}
                    onClick={(e) => {
                      e.stopPropagation();
                      // TODO: Implement rename
                      console.log('Edit:', item.id);
                    }}
                  />
                </Tooltip>
                <Tooltip title="删除">
                  <Button
                    type="text"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={(e) => handleDeleteChat(item.id, e)}
                  />
                </Tooltip>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* User Profile */}
      <div
        style={{
          padding: '16px',
          borderTop: `1px solid ${colorBorderSecondary}`,
          display: 'flex',
          alignItems: 'center',
          cursor: 'pointer',
        }}
      >
        <Dropdown
          menu={{ items: userMenu, onClick: handleMenuClick }}
          placement="topLeft"
          trigger={['click']}
        >
          <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
            <Avatar icon={<UserOutlined />} src={user?.avatar} />
            <div style={{ marginLeft: '12px', overflow: 'hidden' }}>
              <div
                style={{
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {user?.username || 'User'}
              </div>
            </div>
          </div>
        </Dropdown>
      </div>
    </>
  );

  return (
    <Layout style={{ height: '100vh', background: colorBgContainer }}>
      {/* Mobile Header - only visible on mobile */}
      <Header
        className="mobile-header"
        style={{
          background: colorBgContainer,
          borderBottom: `1px solid ${colorBorderSecondary}`,
          padding: '0 16px',
          display: 'none',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <Button
          type="text"
          icon={
            mobileDrawerOpen ? <MenuFoldOutlined /> : <MenuUnfoldOutlined />
          }
          onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)}
          style={{
            fontSize: '18px',
            width: 44,
            height: 44,
          }}
        />
        <div style={{ fontSize: '16px', fontWeight: 600 }}>AI 简历助手</div>
        <Dropdown
          menu={{ items: userMenu, onClick: handleMenuClick }}
          placement="bottomRight"
          trigger={['click']}
        >
          <Avatar
            size="default"
            icon={<UserOutlined />}
            src={user?.avatar}
            style={{ cursor: 'pointer' }}
          />
        </Dropdown>
      </Header>

      {/* Desktop Sidebar */}
      <Sider
        className="desktop-sider"
        width={260}
        theme="light"
        breakpoint="lg"
        collapsedWidth="0"
        onBreakpoint={(broken) => {
          console.log(broken);
        }}
        onCollapse={(collapsed, type) => {
          console.log(collapsed, type);
        }}
        style={{
          borderRight: `1px solid ${colorBorderSecondary}`,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
        }}
      >
        <SidebarContent />
      </Sider>

      {/* Mobile Drawer */}
      <Drawer
        className="mobile-drawer"
        placement="left"
        onClose={() => setMobileDrawerOpen(false)}
        open={mobileDrawerOpen}
        styles={{ body: { padding: 0 } }}
        width={280}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
          }}
        >
          <SidebarContent />
        </div>
      </Drawer>

      <Layout style={{ background: 'transparent' }}>
        <Content
          style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
        >
          <Outlet />
        </Content>
      </Layout>
      <CookieConsent />
    </Layout>
  );
};

export default AppLayout;
