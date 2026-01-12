import React from 'react';
import { Button, Input, Tooltip, Badge, Modal } from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  MessageOutlined,
  EditOutlined,
  DeleteOutlined,
  DashboardOutlined,
  TeamOutlined,
  ApiOutlined,
  FileTextOutlined,
  BarcodeOutlined,
  ToolOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  StarOutlined,
  LineChartOutlined,
  SolutionOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore, useConversationStore } from '@/stores';
import { Role } from '@/types';

// Interface for props if needed, though we use stores mostly
interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse?: () => void;
  setMobileDrawerOpen?: (open: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed,
  onToggleCollapse,
  setMobileDrawerOpen,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const {
    conversations,
    currentConversation,
    deleteConversation,
    createConversation,
    setCurrentConversation,
    switchConversation,
  } = useConversationStore();

  const [searchText, setSearchText] = React.useState('');

  const isAdmin = user?.role === Role.ADMIN;

  const agentNavItems = [
    {
      key: 'resume-optimization',
      icon: <StarOutlined />,
      label: t('menu.resume_optimization', '简历优化'),
      path: '/agents/resume-optimization-expert',
    },
    {
      key: 'interview-prediction',
      icon: <LineChartOutlined />,
      label: t('menu.interview_prediction', '面试预测'),
      path: '/agents/interview-prediction',
    },
    {
      key: 'mock-interview',
      icon: <UserOutlined />,
      label: t('menu.mock_interview', '模拟面试'),
      path: '/agents/mock-interview',
    },
  ];

  const filteredConversations = React.useMemo(() => {
    if (!searchText.trim()) return conversations;
    return conversations.filter((c) =>
      c.title?.toLowerCase().includes(searchText.toLowerCase())
    );
  }, [conversations, searchText]);

  const handleNewChat = async () => {
    try {
      const conversation = await createConversation();
      navigate('/chat');
      setCurrentConversation(conversation);
      if (setMobileDrawerOpen) setMobileDrawerOpen(false);
    } catch {
      // Error handling is managed by store or global message usually,
      // but simplistic here for brevity as per original
    }
  };

  const handleDeleteChat = (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    Modal.confirm({
      title: t('common.delete'),
      content: t('common.delete_confirm'),
      okText: t('common.delete'),
      okType: 'danger',
      cancelText: t('common.cancel'),
      onOk: async () => {
        await deleteConversation(chatId);
        if (currentConversation?.id === chatId) {
          navigate('/chat');
        }
      },
    });
  };

  const handleSelectChat = async (chatId: string) => {
    // Close drawer immediately for mobile
    if (setMobileDrawerOpen) setMobileDrawerOpen(false);

    // If it's already the current chat, just navigate to ensure we are on the chat page
    if (currentConversation?.id === chatId) {
      navigate('/chat');
      return;
    }

    try {
      // Navigate first to show loading state on ChatPage
      navigate('/chat');
      // Then switch the conversation
      await switchConversation(chatId);
    } catch (error) {
      console.error('Failed to switch conversation:', error);
    }
  };

  const adminNavItems = [
    {
      key: 'dashboard',
      icon: <DashboardOutlined />,
      label: t('menu.dashboard', '控制台'),
      path: '/admin/dashboard',
    },
    {
      key: 'users',
      icon: <TeamOutlined />,
      label: t('menu.user_management'),
      path: '/admin/users',
    },
    {
      key: 'models',
      icon: <ApiOutlined />,
      label: t('menu.model_management'),
      path: '/admin/models',
    },
    {
      key: 'prompts',
      icon: <FileTextOutlined />,
      label: t('menu.prompt_management'),
      path: '/admin/prompts',
    },
    {
      key: 'invite-codes',
      icon: <BarcodeOutlined />,
      label: t('menu.invite_code_management'),
      path: '/admin/invite-codes',
    },
    {
      key: 'knowledge-base',
      icon: <FileTextOutlined />,
      label: t('menu.knowledge_base', '知识库'),
      path: '/admin/knowledge-base',
    },
    {
      key: 'system-settings',
      icon: <ToolOutlined />,
      label: t('menu.system_settings'),
      path: '/admin/system-settings',
    },
  ];

  return (
    <div
      className={`sidebar-wrapper ${isCollapsed ? 'collapsed' : ''}`}
      style={{ background: 'transparent' }}
    >
      {/* Brand */}
      <div
        className={`sidebar-brand h-16 flex items-center px-4 ${isCollapsed ? 'justify-center' : 'justify-between'}`}
      >
        {!isCollapsed && (
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-400 to-secondary-400">
            {t('common.app_name')}
          </span>
        )}
        {onToggleCollapse && (
          <Tooltip
            title={isCollapsed ? t('menu.expand') : t('menu.collapse')}
            placement="right"
          >
            <Button
              type="text"
              icon={isCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={onToggleCollapse}
              className={`text-[var(--text-secondary)] hover:text-[var(--text-primary)] ${isCollapsed ? '' : 'ml-auto'}`}
            />
          </Tooltip>
        )}
      </div>

      {/* New Chat */}
      <div className="px-4 mb-4">
        <Tooltip
          title={isCollapsed ? t('menu.new_chat') : ''}
          placement="right"
        >
          <button
            onClick={handleNewChat}
            className={`w-full gradient-button flex items-center justify-center gap-2 ${isCollapsed ? 'p-2' : ''}`}
          >
            <PlusOutlined />
            {!isCollapsed && <span>{t('menu.new_chat')}</span>}
          </button>
        </Tooltip>
      </div>

      {/* Search */}
      {!isCollapsed && (
        <div className="px-4 mb-4">
          <Input
            placeholder={`${t('common.search')}... (⌘K)`}
            prefix={<SearchOutlined className="text-[var(--text-tertiary)]" />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ backgroundColor: 'var(--sidebar-item-hover)' }}
            className="glass-input border-none text-current"
            allowClear
          />
        </div>
      )}

      {/* AI Agents */}
      <div className="px-2 mb-4 space-y-1">
        {!isCollapsed && (
          <div className="px-3 py-2 text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
            {t('menu.agents', 'AI 助手')}
          </div>
        )}
        {agentNavItems.map((item) => (
          <Tooltip
            key={item.key}
            title={isCollapsed ? item.label : ''}
            placement="right"
          >
            <div
              onClick={() => {
                navigate(item.path);
                if (setMobileDrawerOpen) setMobileDrawerOpen(false);
              }}
              className={`
                group flex items-center gap-3 rounded-xl cursor-pointer transition-all duration-200
                ${location.pathname.startsWith(item.path) ? 'text-primary-500 bg-[var(--sidebar-item-active)] shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--sidebar-item-hover)]'}
              `}
              style={{
                paddingLeft: 'var(--sidebar-item-padding-x)',
                paddingRight: 'var(--sidebar-item-padding-x)',
                paddingTop: 'var(--sidebar-item-padding-y)',
                paddingBottom: 'var(--sidebar-item-padding-y)',
              }}
            >
              <span className="flex items-center justify-center w-5">
                {item.icon}
              </span>
              {!isCollapsed && (
                <span className="truncate text-sm font-medium">
                  {item.label}
                </span>
              )}
            </div>
          </Tooltip>
        ))}
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto px-2 space-y-1 scrollbar-hide">
        {!isCollapsed && (
          <div className="px-3 py-2 text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider flex justify-between items-center">
            {t('menu.history')}
            <Badge
              count={filteredConversations.length}
              style={{
                backgroundColor: 'var(--sidebar-item-active)',
                color: 'var(--text-tertiary)',
                boxShadow: 'none',
              }}
            />
          </div>
        )}

        {filteredConversations.map((item) => (
          <Tooltip
            key={item.id}
            title={isCollapsed ? item.title || t('menu.new_chat') : ''}
            placement="right"
          >
            <div
              onClick={() => handleSelectChat(item.id)}
              className={`
                group flex items-center gap-3 rounded-xl cursor-pointer transition-all duration-200 relative
                ${currentConversation?.id === item.id ? 'text-primary-500 shadow-sm' : 'text-[var(--text-secondary)]'}
              `}
              style={{
                paddingLeft: 'var(--sidebar-item-padding-x)',
                paddingRight: 'var(--sidebar-item-padding-x)',
                paddingTop: 'var(--sidebar-item-padding-y)',
                paddingBottom: 'var(--sidebar-item-padding-y)',
                marginTop: 'var(--sidebar-item-margin-y)',
                marginBottom: 'var(--sidebar-item-margin-y)',
                backgroundColor:
                  currentConversation?.id === item.id
                    ? 'var(--sidebar-item-active)'
                    : 'transparent',
              }}
              onMouseEnter={(e) => {
                if (currentConversation?.id !== item.id) {
                  e.currentTarget.style.backgroundColor =
                    'var(--sidebar-item-hover)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                }
              }}
              onMouseLeave={(e) => {
                if (currentConversation?.id !== item.id) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }
              }}
            >
              <MessageOutlined />
              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <div className="truncate text-sm font-medium">
                    {item.title || t('menu.new_chat')}
                  </div>
                </div>
              )}
              {/* Actions (visible on hover) */}
              {!isCollapsed && (
                <div
                  className={`flex gap-1 ${currentConversation?.id === item.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                >
                  <Button
                    type="text"
                    size="small"
                    icon={<EditOutlined />}
                    className="text-gray-400 hover:text-white"
                    onClick={(e) => {
                      e.stopPropagation(); /* Rename logic */
                    }}
                  />
                  <Button
                    type="text"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    className="hover:bg-red-500/20"
                    onClick={(e) => handleDeleteChat(item.id, e)}
                  />
                </div>
              )}
            </div>
          </Tooltip>
        ))}
      </div>

      {/* Admin Links */}
      {isAdmin && !isCollapsed && (
        <div className="mt-4 px-4 pb-4 border-t border-[var(--sidebar-item-hover)]">
          <div className="px-2 py-4 text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-widest text-center">
            {t('menu.admin')}
          </div>
          <div className="flex flex-col items-center w-full space-y-1">
            {adminNavItems.map((item) => (
              <div
                key={item.key}
                onClick={() => {
                  navigate(item.path);
                  if (setMobileDrawerOpen) setMobileDrawerOpen(false);
                }}
                className={`
                  flex items-center gap-3 px-4 py-2.5 rounded-xl cursor-pointer text-sm transition-all duration-200 w-full
                  ${location.pathname.startsWith(item.path) ? 'bg-[var(--sidebar-item-active)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--sidebar-item-hover)]'}
                `}
              >
                <span className="flex items-center justify-center w-5">
                  {item.icon}
                </span>
                <span className="font-medium">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
