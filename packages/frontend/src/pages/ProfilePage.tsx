import React, { useState, useEffect } from 'react';
import {
  Card,
  Avatar,
  Descriptions,
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
import { useAuthStore } from '../stores/authStore';
import { userService, UserActivity, UserNotification } from '../services/userService';
import './common.css';

const { Title, Text } = Typography;

const ProfilePage: React.FC = () => {
  const { user, updateUser } = useAuthStore();
  const [loading, setLoading] = useState(false);

  // Profile Tab States
  const [profileForm] = Form.useForm();
  const [editing, setEditing] = useState(false);

  // Security Tab States
  const [passwordForm] = Form.useForm();

  // History Tab States
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Notifications Tab States
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

  const handleUpdateProfile = async (values: any) => {
    try {
      setLoading(true);
      const updatedUser = await userService.updateProfile(values);
      updateUser(updatedUser);
      message.success('Profile updated successfully');
      setEditing(false);
    } catch (error) {
      message.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (values: any) => {
    try {
      setLoading(true);
      await userService.changePassword(values);
      message.success('Password changed successfully');
      passwordForm.resetFields();
    } catch (error) {
      message.error('Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (options: any) => {
    const { file, onSuccess, onError } = options;
    try {
      // setLoading(true); // Don't block whole page, maybe just avatar spinner
      const avatarUrl = await userService.uploadAvatar(file);
      const updatedUser = await userService.updateProfile({ avatar: avatarUrl });
      updateUser(updatedUser);
      message.success('Avatar uploaded successfully');
      onSuccess(avatarUrl);
    } catch (error) {
      message.error('Failed to upload avatar');
      onError(error);
    }
  };

  const handleBindEmail = async () => {
    message.info('Email binding feature coming soon');
  };

  const handleBindPhone = async () => {
    message.info('Phone binding feature coming soon');
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await userService.markNotificationAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      message.success('Marked as read');
    } catch (error) {
      message.error('Failed to mark as read');
    }
  };

  const loadHistory = async () => {
    try {
      setHistoryLoading(true);
      const res = await userService.getHistory({ page: 1, limit: 20 });
      setActivities(res.data);
    } catch (error) {
      // message.error('Failed to load history');
      // Mock data for now if API fails (since backend might not be ready)
      setActivities([
        { id: '1', action: 'LOGIN', description: 'Logged in from Chrome on MacOS', createdAt: new Date().toISOString() },
        { id: '2', action: 'UPDATE_PROFILE', description: 'Updated profile information', createdAt: new Date(Date.now() - 86400000).toISOString() },
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
    } catch (error: any) {
      if (error?.response?.status === 404) {
        message.warning('通知功能暂未开通，已展示示例通知');
      } else {
        message.error('加载通知失败，已展示示例通知');
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
          content: 'System maintenance scheduled for tomorrow.',
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
    <div style={{ maxWidth: 600 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: 24 }}>
        <Avatar size={80} icon={<UserOutlined />} src={user?.avatar} />
        <div>
           {editing && (
             <Upload 
                showUploadList={false} 
                customRequest={handleAvatarUpload}
                accept="image/*"
             >
                <Button icon={<UploadOutlined />}>Change Avatar</Button>
             </Upload>
           )}
        </div>
      </div>

      <Form
        form={profileForm}
        layout="vertical"
        disabled={!editing}
        onFinish={handleUpdateProfile}
      >
        <Form.Item name="username" label="Username" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="email" label="Email">
          <Input disabled />
        </Form.Item>
        <Form.Item name="phone" label="Phone">
          <Input />
        </Form.Item>
        <Form.Item name="bio" label="Bio">
          <Input.TextArea rows={4} />
        </Form.Item>

        {editing ? (
          <Space>
            <Button type="primary" htmlType="submit" loading={loading}>
              Save Changes
            </Button>
            <Button onClick={() => setEditing(false)}>Cancel</Button>
          </Space>
        ) : (
          <Button type="primary" onClick={() => setEditing(true)}>
            Edit Profile
          </Button>
        )}
      </Form>
    </div>
  );

  const SecurityTab = () => (
    <div style={{ maxWidth: 600 }}>
      <Title level={5}>Change Password</Title>
      <Form
        form={passwordForm}
        layout="vertical"
        onFinish={handleChangePassword}
      >
        <Form.Item
          name="currentPassword"
          label="Current Password"
          rules={[{ required: true }]}
        >
          <Input.Password prefix={<LockOutlined />} />
        </Form.Item>
        <Form.Item
          name="newPassword"
          label="New Password"
          rules={[{ required: true, min: 6 }]}
        >
          <Input.Password prefix={<LockOutlined />} />
        </Form.Item>
        <Form.Item
          name="confirmPassword"
          label="Confirm New Password"
          dependencies={['newPassword']}
          rules={[
            { required: true },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('newPassword') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error('The two passwords do not match!'));
              },
            }),
          ]}
        >
          <Input.Password prefix={<LockOutlined />} />
        </Form.Item>

        <Button type="primary" htmlType="submit" loading={loading}>
          Update Password
        </Button>
      </Form>

      <div style={{ marginTop: 40 }}>
        <Title level={5}>Account Bindings</Title>
        <List
          itemLayout="horizontal"
          dataSource={[
            {
              title: 'Email',
              description: user?.email || 'Not bound',
              icon: <MailOutlined />,
              action: handleBindEmail,
              buttonText: user?.email ? 'Change' : 'Bind',
            },
            {
              title: 'Phone',
              description: user?.phone || 'Not bound',
              icon: <PhoneOutlined />,
              action: handleBindPhone,
              buttonText: user?.phone ? 'Change' : 'Bind',
            },
          ]}
          renderItem={(item) => (
            <List.Item
              actions={[<Button type="link" onClick={item.action}>{item.buttonText}</Button>]}
            >
              <List.Item.Meta
                avatar={<Avatar icon={item.icon} style={{ backgroundColor: '#f0f2f5', color: '#1890ff' }} />}
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
            avatar={<Avatar icon={<HistoryOutlined />} style={{ backgroundColor: '#1890ff' }} />}
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
              >
                Mark as read
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
                <Tag color={item.type === 'ERROR' ? 'red' : item.type === 'WARNING' ? 'orange' : 'blue'}>
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
      label: 'Profile',
      children: <ProfileTab />,
      icon: <UserOutlined />,
    },
    {
      key: 'security',
      label: 'Security',
      children: <SecurityTab />,
      icon: <LockOutlined />,
    },
    {
      key: 'history',
      label: 'History',
      children: <HistoryTab />,
      icon: <HistoryOutlined />,
    },
    {
      key: 'notifications',
      label: 'Notifications',
      children: <NotificationsTab />,
      icon: <BellOutlined />,
    },
  ];

  return (
    <div className="profile-container">
      <Card>
        <Title level={2} style={{ marginBottom: 24 }}>Personal Center</Title>
        <Tabs items={items} onChange={handleTabChange} />
      </Card>
    </div>
  );
};

export default ProfilePage;
