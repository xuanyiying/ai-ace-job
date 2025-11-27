import React from 'react';
import { Card, Avatar, Descriptions, Button, Space, Typography } from 'antd';
import { UserOutlined, EditOutlined } from '@ant-design/icons';
import { useAuthStore } from '../stores/authStore';

const { Title } = Typography;

const ProfilePage: React.FC = () => {
  const { user } = useAuthStore();

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <Title level={2}>个人中心</Title>

      <Card style={{ marginTop: '24px' }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <Avatar size={80} icon={<UserOutlined />} src={user?.avatar} />
            <div>
              <Title level={4} style={{ margin: 0 }}>
                {user?.username}
              </Title>
              <p style={{ color: '#666', margin: '4px 0 0 0' }}>
                {user?.email}
              </p>
            </div>
          </div>

          <Descriptions title="基本信息" bordered column={1}>
            <Descriptions.Item label="用户名">
              {user?.username}
            </Descriptions.Item>
            <Descriptions.Item label="邮箱">{user?.email}</Descriptions.Item>
            <Descriptions.Item label="注册时间">
              {user?.createdAt
                ? new Date(user.createdAt).toLocaleDateString('zh-CN')
                : '-'}
            </Descriptions.Item>
          </Descriptions>

          <Button type="primary" icon={<EditOutlined />}>
            编辑资料
          </Button>
        </Space>
      </Card>
    </div>
  );
};

export default ProfilePage;
