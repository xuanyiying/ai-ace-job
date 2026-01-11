import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Form,
  Input,
  Button,
  Typography,
  Divider,
  message,
  Checkbox,
} from 'antd';
import {
  UserOutlined,
  LockOutlined,
  MailOutlined,
  GithubOutlined,
  GoogleOutlined,
  RocketOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../stores/authStore';
import { authService } from '../services/auth-service';
import './auth.css';

const { Title, Text } = Typography;

const RegisterPage: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const onFinish = async (values: any) => {
    try {
      setLoading(true);
      await authService.register(values);
      message.success(t('auth.register_success', 'Registration successful!'));
      navigate('/login');
    } catch (error) {
      message.error(t('auth.register_failed', 'Registration failed.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-primary/5">
      {/* Background Decor - Simplified for CSS Polyfill */}
      <div className="absolute w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-secondary-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-primary-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="glass-card p-8 w-full max-w-md relative z-10 mx-4 border border-white/10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-secondary-500/10 border border-secondary-500/20 mb-4">
            <RocketOutlined className="text-3xl" style={{ color: '#a855f7' }} />
          </div>
          <Title level={2} className="!text-white !font-bold !mb-2">
            创建账号
          </Title>
          <Text className="!text-gray-400">开启您的 AI 职业助手之旅</Text>
        </div>

        <Form
          name="register"
          onFinish={onFinish}
          layout="vertical"
          size="large"
          className="auth-form"
        >
          <Form.Item
            name="username"
            rules={[
              {
                required: true,
                message: t(
                  'auth.username_required',
                  'Please input your username!'
                ),
              },
            ]}
          >
            <Input
              prefix={<UserOutlined className="text-gray-400" />}
              placeholder={t('auth.username_placeholder', 'Username')}
              className="!bg-white/5 !border-white/10 !text-white placeholder:!text-gray-500"
            />
          </Form.Item>

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
              prefix={<MailOutlined className="text-gray-400" />}
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

          <Form.Item
            name="agreement"
            valuePropName="checked"
            rules={[
              {
                validator: (_, value) =>
                  value
                    ? Promise.resolve()
                    : Promise.reject(new Error('Should accept agreement')),
              },
            ]}
          >
            <Checkbox className="!text-gray-400">
              我已阅读并同意{' '}
              <a href="/terms" className="text-primary-400">
                服务条款
              </a>{' '}
              和{' '}
              <a href="/privacy" className="text-primary-400">
                隐私政策
              </a>
            </Checkbox>
          </Form.Item>

          <Form.Item className="mb-4">
            <button
              type="submit"
              disabled={loading}
              className="gradient-button w-full h-12 text-base font-bold shadow-lg hover:shadow-secondary-500/20"
            >
              {loading ? '注册中...' : '立即注册'}
            </button>
          </Form.Item>

          <Divider className="!border-white/10 !text-gray-500 !text-xs">
            或使用以下方式
          </Divider>

          <div className="flex justify-center gap-4 mb-6">
            <Button
              shape="circle"
              size="large"
              icon={<GoogleOutlined />}
              className="!bg-white/5 !border-white/10 !text-white hover:!bg-white/10 hover:!border-primary-500 hover:!text-primary-400 w-12 h-12 flex items-center justify-center transition-all"
            />
            <Button
              shape="circle"
              size="large"
              icon={<GithubOutlined />}
              className="!bg-white/5 !border-white/10 !text-white hover:!bg-white/10 hover:!border-primary-500 hover:!text-primary-400 w-12 h-12 flex items-center justify-center transition-all"
            />
          </div>

          {/* Login Link */}
          <div className="text-center mt-6">
            <Text className="!text-gray-400">
              {t('auth.have_account')}{' '}
              <Link
                to="/login"
                className="text-primary-400 hover:text-primary-300 font-medium hover:underline transition-all"
              >
                {t('auth.login')}
              </Link>
            </Text>
          </div>
        </Form>
      </div>
    </div>
  );
};

export default RegisterPage;
