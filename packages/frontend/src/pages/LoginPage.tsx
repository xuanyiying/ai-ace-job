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
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../stores/authStore';
import { authService } from '../services/authService';
import { authClient } from '../lib/auth-client';
import './auth.css';

const { Title, Text } = Typography;

interface LoginFormValues {
  email: string;
  password: string;
  remember?: boolean;
}

const LoginPage: React.FC = () => {
  const { t } = useTranslation();
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

      // 🔍 DEBUG LOG: 检查登录响应数据
      console.log('🔍 [LOGIN PAGE] Login response:', {
        user: response.user
      });

      // Ensure we have a token
      const token = response.token || response.accessToken;
      if (!token) {
        throw new Error(t('common.error'));
      }

      // Set auth state
      console.log('🔍 [LOGIN PAGE] Calling setAuth with user:', response.user);
      setAuth(response.user, token);

      message.success(t('auth.login_success'));

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
        t('auth.login_failed');
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Check if OAuth is enabled
  const isGoogleOAuthEnabled =
    import.meta.env.VITE_GOOGLE_OAUTH_ENABLED === 'true';
  const isGithubOAuthEnabled =
    import.meta.env.VITE_GITHUB_OAUTH_ENABLED === 'true';
  const isAnyOAuthEnabled = isGoogleOAuthEnabled || isGithubOAuthEnabled;

  return (
    <div className="auth-container">
      <div className="auth-card">
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* Logo and Title */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🤖</div>
            <Title level={2} style={{ margin: 0 }}>
              {t('common.app_name')}
            </Title>
            <Text type="secondary">{t('auth.title_login')}</Text>
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
                { required: true, message: t('auth.email_required') },
                { type: 'email', message: t('auth.email_invalid') },
              ]}
            >
              <Input prefix={<UserOutlined />} placeholder={t('auth.email')} />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[
                { required: true, message: t('auth.password_required') },
                { min: 6, message: t('auth.password_min') },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder={t('auth.password')}
              />
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
                  <Checkbox>{t('auth.remember_me')}</Checkbox>
                </Form.Item>
                <a href="#" style={{ color: '#667eea' }}>
                  {t('auth.forgot_password')}
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
                {t('auth.login')}
              </Button>
            </Form.Item>
          </Form>

          {/* Divider and Social Login */}
          {isAnyOAuthEnabled && (
            <>
              <Divider plain>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  {t('auth.or_social')}
                </Text>
              </Divider>

              {/* Social Login */}
              <Space
                style={{ width: '100%', justifyContent: 'center' }}
                size="large"
              >
                {isGoogleOAuthEnabled && (
                  <Button
                    shape="circle"
                    size="large"
                    icon={<GoogleOutlined />}
                    style={{ width: '48px', height: '48px' }}
                    onClick={async () => {
                      await authClient.signIn.social({
                        provider: 'google',
                        callbackURL: '/',
                      });
                    }}
                  />
                )}
                {isGithubOAuthEnabled && (
                  <Button
                    shape="circle"
                    size="large"
                    icon={<GithubOutlined />}
                    style={{ width: '48px', height: '48px' }}
                    onClick={async () => {
                      await authClient.signIn.social({
                        provider: 'github',
                        callbackURL: '/',
                      });
                    }}
                  />
                )}
              </Space>
            </>
          )}

          {/* Register Link */}
          <div style={{ textAlign: 'center' }}>
            <Text type="secondary">
              {t('auth.no_account')}{' '}
              <Link
                to="/register"
                style={{ color: '#667eea', fontWeight: 500 }}
              >
                {t('auth.register')}
              </Link>
            </Text>
          </div>
        </Space>
      </div>
    </div>
  );
};

export default LoginPage;
