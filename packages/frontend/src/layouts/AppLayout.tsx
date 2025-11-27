import React, { useState } from 'react';
import { Layout, Avatar, Dropdown, Button, theme, Modal, Tooltip } from 'antd';
import type { MenuProps } from 'antd';
import {
  UserOutlined,
  PlusOutlined,
  MessageOutlined,
  SettingOutlined,
  LogoutOutlined,
  DeleteOutlined,
  EditOutlined,
} from '@ant-design/icons';
import { useNavigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import './AppLayout.css';

const { Sider, Content } = Layout;

const AppLayout: React.FC = () => {
  const [selectedChat, setSelectedChat] = useState('1');
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const {
    token: { colorBgContainer, colorBorderSecondary },
  } = theme.useToken();

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

  const handleNewChat = () => {
    const newId = Date.now().toString();
    setSelectedChat(newId);
  };

  const handleDeleteChat = (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    Modal.confirm({
      title: '删除对话',
      content: '确定要删除这个对话吗？',
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => {
        console.log('Delete chat:', chatId);
      },
    });
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
      label: '设置',
      icon: <SettingOutlined />,
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

  // Mock history data
  const historyItems = [
    { key: '1', label: '简历优化建议', time: '2小时前' },
    { key: '2', label: '模拟面试 - Java后端', time: '昨天' },
    { key: '3', label: '自我介绍润色', time: '3天前' },
  ];

  return (
    <Layout style={{ height: '100vh', background: colorBgContainer }}>
      <Sider
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
            {historyItems.map((item) => (
              <div
                key={item.key}
                onClick={() => setSelectedChat(item.key)}
                style={{
                  padding: '12px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  background:
                    selectedChat === item.key ? '#f0f0f0' : 'transparent',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  position: 'relative',
                  overflow: 'hidden',
                }}
                onMouseEnter={(e) => {
                  if (selectedChat !== item.key) {
                    e.currentTarget.style.background = '#fafafa';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedChat !== item.key) {
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
                      {item.label}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: '#999',
                      paddingLeft: '22px',
                    }}
                  >
                    {item.time}
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
                        console.log('Edit:', item.key);
                      }}
                    />
                  </Tooltip>
                  <Tooltip title="删除">
                    <Button
                      type="text"
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={(e) => handleDeleteChat(item.key, e)}
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
            <div
              style={{ display: 'flex', alignItems: 'center', width: '100%' }}
            >
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
      </Sider>

      <Layout style={{ background: 'transparent' }}>
        <Content
          style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default AppLayout;
