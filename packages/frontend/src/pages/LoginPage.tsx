import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Form,
  Input,
  Button,
  Checkbox,
  Typography,
  Space,
  Divider,
  message,
} from 'antd';
import {
  UserOutlined,
  LockOutlined,
  GithubOutlined,
  GoogleOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../stores/authStore';
import { authService } from '../services/authService';

const { Title, Text } = Typography;

interface LoginFormValues {
  email: string;
  password: string;
  remember?: boolean;
}

const LoginPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setAuth, isAuthenticated } = useAuthStore();

  // Redirect if already authenticated
  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const onFinish = async (values: LoginFormValues) => {
    setLoading(true);
    try {
      const response = await authService.login({
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

      message.success('登录成功！');

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
        '登录失败，请检查邮箱和密码';
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
              AI 简历助手
            </Title>
            <Text type="secondary">登录您的账号</Text>
          </div>

          {/* Login Form */}
          <Form
            name="login"
            onFinish={onFinish}
            autoComplete="off"
            size="large"
          >
            <Form.Item
              name="email"
              rules={[
                { required: true, message: '请输入邮箱地址！' },
                { type: 'email', message: '请输入有效的邮箱地址！' },
              ]}
            >
              <Input prefix={<UserOutlined />} placeholder="邮箱地址" />
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

            <Form.Item>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Form.Item name="remember" valuePropName="checked" noStyle>
                  <Checkbox>记住我</Checkbox>
                </Form.Item>
                <a href="#" style={{ color: '#667eea' }}>
                  忘记密码？
                </a>
              </div>
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
                登录
              </Button>
            </Form.Item>
          </Form>

          {/* Divider */}
          <Divider plain>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              或使用以下方式登录
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

          {/* Register Link */}
          <div style={{ textAlign: 'center' }}>
            <Text type="secondary">
              还没有账号？{' '}
              <Link
                to="/register"
                style={{ color: '#667eea', fontWeight: 500 }}
              >
                立即注册
              </Link>
            </Text>
          </div>
        </Space>
      </div>
    </div>
  );
};

export default LoginPage;
