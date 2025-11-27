import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Form, Input, Button, Typography, Space, Divider, message } from 'antd';
import {
  UserOutlined,
  LockOutlined,
  MailOutlined,
  GithubOutlined,
  GoogleOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../stores/authStore';
import { authService } from '../services/authService';

const { Title, Text } = Typography;

interface RegisterFormValues {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

const RegisterPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setAuth, isAuthenticated } = useAuthStore();

  // Redirect if already authenticated
  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const onFinish = async (values: RegisterFormValues) => {
    setLoading(true);
    try {
      const response = await authService.register({
        username: values.username,
        email: values.email,
        password: values.password,
      });

      // Ensure we have a token
      const token = response.token || response.accessToken;
      if (!token) {
        throw new Error('未收到认证令牌');
      }

      // Set auth state
      setAuth(response.user, token);

      message.success('注册成功！');

      // Use setTimeout to ensure state is updated before navigation
      setTimeout(() => {
        navigate('/', { replace: true });
      }, 100);
    } catch (err: unknown) {
      const errorMessage =
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (err as any)?.response?.data?.message ||
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (err as any)?.message ||
        '注册失败，请稍后重试';
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '20px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '400px',
          background: '#fff',
          borderRadius: '16px',
          padding: '48px 40px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        }}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* Logo and Title */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🤖</div>
            <Title level={2} style={{ margin: 0 }}>
              创建账号
            </Title>
            <Text type="secondary">开始您的AI简历优化之旅</Text>
          </div>

          {/* Register Form */}
          <Form
            name="register"
            onFinish={onFinish}
            autoComplete="off"
            size="large"
          >
            <Form.Item
              name="username"
              rules={[
                { required: true, message: '请输入用户名！' },
                { min: 3, message: '用户名至少3个字符！' },
              ]}
            >
              <Input prefix={<UserOutlined />} placeholder="用户名" />
            </Form.Item>

            <Form.Item
              name="email"
              rules={[
                { required: true, message: '请输入邮箱地址！' },
                { type: 'email', message: '请输入有效的邮箱地址！' },
              ]}
            >
              <Input prefix={<MailOutlined />} placeholder="邮箱地址" />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[
                { required: true, message: '请输入密码！' },
                { min: 6, message: '密码至少6个字符！' },
              ]}
            >
              <Input.Password prefix={<LockOutlined />} placeholder="密码" />
            </Form.Item>

            <Form.Item
              name="confirmPassword"
              dependencies={['password']}
              rules={[
                { required: true, message: '请确认密码！' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('两次输入的密码不一致！'));
                  },
                }),
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="确认密码"
              />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                style={{
                  height: '48px',
                  fontSize: '16px',
                  background:
                    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: 'none',
                }}
              >
                注册
              </Button>
            </Form.Item>
          </Form>

          {/* Divider */}
          <Divider plain>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              或使用以下方式注册
            </Text>
          </Divider>

          {/* Social Login */}
          <Space
            style={{ width: '100%', justifyContent: 'center' }}
            size="large"
          >
            <Button
              shape="circle"
              size="large"
              icon={<GoogleOutlined />}
              style={{ width: '48px', height: '48px' }}
            />
            <Button
              shape="circle"
              size="large"
              icon={<GithubOutlined />}
              style={{ width: '48px', height: '48px' }}
            />
          </Space>

          {/* Login Link */}
          <div style={{ textAlign: 'center' }}>
            <Text type="secondary">
              已有账号？{' '}
              <Link to="/login" style={{ color: '#667eea', fontWeight: 500 }}>
                立即登录
              </Link>
            </Text>
          </div>
        </Space>
      </div>
    </div>
  );
};

export default RegisterPage;
