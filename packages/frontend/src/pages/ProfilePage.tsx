import React, { useState, useEffect } from 'react';
import {
  Card,
  Avatar,
  Button,
  Space,
  Typography,
  Tabs,
  Form,
  Input,
  Upload,
  message,
  List,
  Tag,
  Badge,
} from 'antd';
import {
  UserOutlined,
  UploadOutlined,
  LockOutlined,
  HistoryOutlined,
  BellOutlined,
  CheckOutlined,
  MailOutlined,
  PhoneOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../stores/authStore';
import {
  userService,
  UserActivity,
  UserNotification,
  ChangePasswordDto,
} from '../services/user-service';
import './common.css';

const { Title, Text } = Typography;

const ProfilePage: React.FC = () => {
  const { t } = useTranslation();
  const { user, updateUser } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const [profileForm] = Form.useForm();
  const [editing, setEditing] = useState(false);
  const [passwordForm] = Form.useForm();
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);

  useEffect(() => {
    if (user) {
      profileForm.setFieldsValue({
        username: user.username,
        email: user.email,
        bio: user.bio,
        phone: user.phone,
      });
    }
  }, [user, profileForm]);

  const handleUpdateProfile = async (values: {
    username?: string;
    avatar?: string;
    bio?: string;
    phone?: string;
  }) => {
    try {
      setLoading(true);
      const updatedUser = await userService.updateProfile(values);
      updateUser(updatedUser);
      message.success(t('profile.update_success'));
      setEditing(false);
    } catch {
      message.error(t('profile.update_failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (
    values: ChangePasswordDto & { confirmPassword: string }
  ) => {
    try {
      setLoading(true);
      await userService.changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      message.success(t('profile.password_changed'));
      passwordForm.resetFields();
    } catch {
      message.error(t('profile.password_change_failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (options: {
    file: File;
    onSuccess: (url: string) => void;
    onError: (error: unknown) => void;
  }) => {
    const { file, onSuccess, onError } = options;
    try {
      const avatarUrl = await userService.uploadAvatar(file);
      const updatedUser = await userService.updateProfile({
        avatar: avatarUrl,
      });
      updateUser(updatedUser);
      message.success(t('profile.avatar_upload_success'));
      onSuccess(avatarUrl);
    } catch (error) {
      message.error(t('profile.avatar_upload_failed'));
      onError(error);
    }
  };

  const handleBindEmail = async () => {
    message.info(t('profile.feature_coming_soon'));
  };

  const handleBindPhone = async () => {
    message.info(t('profile.feature_coming_soon'));
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await userService.markNotificationAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      message.success(t('common.success'));
    } catch {
      message.error(t('common.error'));
    }
  };

  const loadHistory = async () => {
    try {
      setHistoryLoading(true);
      const res = await userService.getHistory({ page: 1, limit: 20 });
      setActivities(res.data);
    } catch {
      setActivities([
        {
          id: '1',
          action: 'LOGIN',
          description: 'Logged in',
          createdAt: new Date().toISOString(),
        },
        {
          id: '2',
          action: 'UPDATE_PROFILE',
          description: 'Updated profile',
          createdAt: new Date(Date.now() - 86400000).toISOString(),
        },
      ]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const loadNotifications = async () => {
    try {
      setNotifLoading(true);
      const res = await userService.getNotifications({ page: 1, limit: 20 });
      setNotifications(res.data);
    } catch (error: unknown) {
      const err = error as { response?: { status?: number } };
      if (err?.response?.status === 404) {
        message.warning(t('profile.notification_feature_unavailable'));
      } else {
        message.error(t('profile.load_notifications_failed'));
      }
      setNotifications([
        {
          id: '1',
          title: 'Welcome',
          content: 'Welcome to AI Resume!',
          type: 'INFO',
          read: false,
          createdAt: new Date().toISOString(),
        },
        {
          id: '2',
          title: 'System Update',
          content: 'Maintenance scheduled.',
          type: 'WARNING',
          read: true,
          createdAt: new Date(Date.now() - 86400000).toISOString(),
        },
      ]);
    } finally {
      setNotifLoading(false);
    }
  };

  const handleTabChange = (key: string) => {
    if (key === 'history') loadHistory();
    if (key === 'notifications') loadNotifications();
  };

  const ProfileTab = () => (
    <div className="tab-content">
      <div className="avatar-section">
        <Avatar size={80} icon={<UserOutlined />} src={user?.avatar} />
        {editing && (
          <Upload
            showUploadList={false}
            customRequest={handleAvatarUpload as never}
            accept="image/*"
          >
            <Button icon={<UploadOutlined />}>
              {t('profile.change_avatar')}
            </Button>
          </Upload>
        )}
      </div>
      <Form
        form={profileForm}
        layout="vertical"
        disabled={!editing}
        onFinish={handleUpdateProfile}
      >
        <Form.Item
          name="username"
          label={t('profile.username')}
          rules={[{ required: true }]}
        >
          <Input />
        </Form.Item>
        <Form.Item name="email" label={t('profile.email')}>
          <Input disabled />
        </Form.Item>
        <Form.Item name="phone" label={t('profile.phone')}>
          <Input />
        </Form.Item>
        <Form.Item name="bio" label={t('profile.bio')}>
          <Input.TextArea rows={4} />
        </Form.Item>
        {editing ? (
          <Space>
            <Button type="primary" htmlType="submit" loading={loading}>
              {t('profile.save_changes')}
            </Button>
            <Button onClick={() => setEditing(false)}>
              {t('common.cancel')}
            </Button>
          </Space>
        ) : (
          <Button type="primary" onClick={() => setEditing(true)}>
            {t('profile.edit_profile')}
          </Button>
        )}
      </Form>
    </div>
  );

  const SecurityTab = () => (
    <div className="tab-content">
      <Title level={5}>{t('profile.change_password')}</Title>
      <Form
        form={passwordForm}
        layout="vertical"
        onFinish={handleChangePassword}
      >
        <Form.Item
          name="currentPassword"
          label={t('profile.current_password')}
          rules={[{ required: true }]}
        >
          <Input.Password prefix={<LockOutlined />} />
        </Form.Item>
        <Form.Item
          name="newPassword"
          label={t('profile.new_password')}
          rules={[{ required: true, min: 6 }]}
        >
          <Input.Password prefix={<LockOutlined />} />
        </Form.Item>
        <Form.Item
          name="confirmPassword"
          label={t('profile.confirm_new_password')}
          dependencies={['newPassword']}
          rules={[
            { required: true },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('newPassword') === value)
                  return Promise.resolve();
                return Promise.reject(
                  new Error(t('profile.password_mismatch'))
                );
              },
            }),
          ]}
        >
          <Input.Password prefix={<LockOutlined />} />
        </Form.Item>
        <Button type="primary" htmlType="submit" loading={loading}>
          {t('profile.change_password')}
        </Button>
      </Form>
      <div style={{ marginTop: 40 }}>
        <Title level={5}>{t('profile.account_bindings')}</Title>
        <List
          itemLayout="horizontal"
          dataSource={[
            {
              title: t('profile.email'),
              description: user?.email || t('profile.not_bound'),
              icon: <MailOutlined />,
              action: handleBindEmail,
              buttonText: user?.email ? t('profile.change') : t('profile.bind'),
            },
            {
              title: t('profile.phone'),
              description: user?.phone || t('profile.not_bound'),
              icon: <PhoneOutlined />,
              action: handleBindPhone,
              buttonText: user?.phone ? t('profile.change') : t('profile.bind'),
            },
          ]}
          renderItem={(item) => (
            <List.Item
              actions={[
                <Button type="link" onClick={item.action} key="action">
                  {item.buttonText}
                </Button>,
              ]}
            >
              <List.Item.Meta
                avatar={
                  <Avatar
                    icon={item.icon}
                    style={{ backgroundColor: '#f0f2f5', color: '#1890ff' }}
                  />
                }
                title={item.title}
                description={item.description}
              />
            </List.Item>
          )}
        />
      </div>
    </div>
  );

  const HistoryTab = () => (
    <List
      loading={historyLoading}
      itemLayout="horizontal"
      dataSource={activities}
      renderItem={(item) => (
        <List.Item>
          <List.Item.Meta
            avatar={
              <Avatar
                icon={<HistoryOutlined />}
                style={{ backgroundColor: '#1890ff' }}
              />
            }
            title={item.action}
            description={
              <Space direction="vertical" size={0}>
                <Text>{item.description}</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {new Date(item.createdAt).toLocaleString()}
                </Text>
              </Space>
            }
          />
        </List.Item>
      )}
    />
  );

  const NotificationsTab = () => (
    <List
      loading={notifLoading}
      itemLayout="horizontal"
      dataSource={notifications}
      renderItem={(item) => (
        <List.Item
          actions={[
            !item.read && (
              <Button
                type="link"
                size="small"
                icon={<CheckOutlined />}
                onClick={() => handleMarkAsRead(item.id)}
                key="mark-read"
              >
                {t('profile.mark_as_read')}
              </Button>
            ),
          ]}
        >
          <List.Item.Meta
            avatar={
              <Badge dot={!item.read}>
                <Avatar icon={<BellOutlined />} />
              </Badge>
            }
            title={
              <Space>
                <Text strong={!item.read}>{item.title}</Text>
                <Tag
                  color={
                    item.type === 'ERROR'
                      ? 'red'
                      : item.type === 'WARNING'
                        ? 'orange'
                        : 'blue'
                  }
                >
                  {item.type}
                </Tag>
              </Space>
            }
            description={
              <Space direction="vertical" size={0}>
                <Text>{item.content}</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {new Date(item.createdAt).toLocaleString()}
                </Text>
              </Space>
            }
          />
        </List.Item>
      )}
    />
  );

  const items = [
    {
      key: 'profile',
      label: t('profile.tab_profile'),
      children: <ProfileTab />,
      icon: <UserOutlined />,
    },
    {
      key: 'security',
      label: t('profile.tab_security'),
      children: <SecurityTab />,
      icon: <LockOutlined />,
    },
    {
      key: 'history',
      label: t('profile.tab_history'),
      children: <HistoryTab />,
      icon: <HistoryOutlined />,
    },
    {
      key: 'notifications',
      label: t('profile.tab_notifications'),
      children: <NotificationsTab />,
      icon: <BellOutlined />,
    },
  ];

  return (
    <div className="profile-container animate-fade-in relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-secondary-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="glass-card p-6 md:p-8 relative z-10 border border-white/10">
        <div className="mb-8">
          <Title
            level={2}
            className="!m-0 !text-white !font-bold tracking-tight"
          >
            {t('profile.title')}
          </Title>
          <Text className="!text-gray-400 mt-1 block">
            管理您的个人资料、安全设置和账户通知
          </Text>
        </div>

        <Tabs
          items={items}
          onChange={handleTabChange}
          className="modern-tabs"
        />
      </div>
    </div>
  );
};

export default ProfilePage;
