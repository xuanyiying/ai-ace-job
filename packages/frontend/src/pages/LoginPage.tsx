import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Form,
  Input,
  Button,
  Checkbox,
  Typography,
  Divider,
  message,
} from 'antd';
import {
  UserOutlined,
  LockOutlined,
  GithubOutlined,
  GoogleOutlined,
  RocketOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../stores/authStore';
import { authService } from '../services/auth-service';
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
    try {
      setLoading(true);
      const { user, token } = await authService.login(values);
      if (token) {
        setAuth(user, token);
        message.success(t('auth.login_success', 'Login successful!'));
        navigate('/chat');
      } else {
        throw new Error('No token received');
      }
    } catch (error) {
      message.error(
        t('auth.login_failed', 'Login failed. Please check your credentials.')
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = (provider: string) => {
    if (provider === 'google' && !import.meta.env.VITE_GOOGLE_OAUTH_ENABLED) {
      message.info(t('auth.feature_disabled', 'Feature not enabled'));
      return;
    }
    if (provider === 'github' && !import.meta.env.VITE_GITHUB_OAUTH_ENABLED) {
      message.info(t('auth.feature_disabled', 'Feature not enabled'));
      return;
    }
    window.location.href = `${import.meta.env.VITE_API_URL}/auth/${provider}`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-primary/5">
      {/* Background Decor Effects */}
      <div className="absolute w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-primary-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-primary-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="glass-card p-8 w-full max-w-md relative z-10 mx-4 border border-white/10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-primary-500/10 border border-primary-500/20 mb-4">
            <RocketOutlined className="text-3xl text-primary-400" />
          </div>
          <Title level={2} className="!text-white !font-bold !mb-2">
            AI 简历助手
          </Title>
          <Text className="!text-gray-400">登录您的账号</Text>
        </div>

        <Form
          name="login"
          initialValues={{ remember: true }}
          onFinish={onFinish}
          layout="vertical"
          size="large"
          className="auth-form"
        >
          <Form.Item
            name="email"
            rules={[
              {
                required: true,
                message: t('auth.email_required', 'Please input your email!'),
              },
              {
                type: 'email',
                message: t('auth.email_invalid', 'Invalid email format!'),
              },
            ]}
          >
            <Input
              prefix={<UserOutlined className="text-gray-400" />}
              placeholder={t('auth.email_placeholder', 'Email Address')}
              className="!bg-white/5 !border-white/10 !text-white placeholder:!text-gray-500"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[
              {
                required: true,
                message: t(
                  'auth.password_required',
                  'Please input your password!'
                ),
              },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined className="text-gray-400" />}
              placeholder={t('auth.password_placeholder', 'Password')}
              className="!bg-white/5 !border-white/10 !text-white placeholder:!text-gray-500"
            />
          </Form.Item>

          <div className="flex justify-between items-center mb-6">
            <Form.Item name="remember" valuePropName="checked" noStyle>
              <Checkbox className="!text-gray-400">记住我</Checkbox>
            </Form.Item>
            <Link to="/forgot-password">
              <span className="text-primary-400 hover:text-primary transition-colors">
                忘记密码?
              </span>
            </Link>
          </div>

          <Form.Item className="mb-4">
            <button
              type="submit"
              disabled={loading}
              className="gradient-button w-full h-12 text-base font-bold shadow-lg hover:shadow-primary-500/20"
            >
              {loading ? '登录中...' : '登 录'}
            </button>
          </Form.Item>
        </Form>

        <Divider className="!border-white/10 !text-gray-500 !text-xs">
          或使用以下方式
        </Divider>

        <div className="flex justify-center gap-4 mb-6">
          <Button
            shape="circle"
            icon={<GoogleOutlined />}
            size="large"
            onClick={() => handleSocialLogin('google')}
            className="!bg-white/5 !border-white/10 !text-white hover:!bg-white/10"
          />
          <Button
            shape="circle"
            icon={<GithubOutlined />}
            size="large"
            onClick={() => handleSocialLogin('github')}
            className="!bg-white/5 !border-white/10 !text-white hover:!bg-white/10"
          />
        </div>

        {/* Register Link */}
        <div className="text-center mt-6">
          <Text className="!text-gray-400">
            {t('auth.no_account')}{' '}
            <Link
              to="/register"
              className="text-primary-400 hover:text-primary-300 font-medium hover:underline transition-all"
            >
              {t('auth.register')}
            </Link>
          </Text>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
