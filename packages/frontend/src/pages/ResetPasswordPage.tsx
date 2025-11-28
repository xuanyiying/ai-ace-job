import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, message, Result } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { authService } from '../services/authService';

const { Title, Text } = Typography;

const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const token = searchParams.get('token');

  const onFinish = async (values: { password: string }) => {
    if (!token) {
      message.error('Invalid token');
      return;
    }

    setLoading(true);
    try {
      await authService.resetPassword(token, values.password);
      setSuccess(true);
      message.success('Password reset successfully!');
    } catch (error) {
      console.error('Failed to reset password:', error);
      message.error('Failed to reset password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
        }}
      >
        <Result
          status="error"
          title="Invalid Link"
          subTitle="The password reset link is invalid or missing."
          extra={[
            <Button
              type="primary"
              key="login"
              onClick={() => navigate('/login')}
            >
              Go to Login
            </Button>,
          ]}
        />
      </div>
    );
  }

  if (success) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
        }}
      >
        <Result
          status="success"
          title="Password Reset Successfully"
          subTitle="You can now login with your new password."
          extra={[
            <Button
              type="primary"
              key="login"
              onClick={() => navigate('/login')}
            >
              Go to Login
            </Button>,
          ]}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: '#f0f2f5',
      }}
    >
      <Card style={{ width: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Title level={3}>Reset Password</Title>
          <Text type="secondary">Enter your new password</Text>
        </div>

        <Form name="reset_password" onFinish={onFinish} layout="vertical">
          <Form.Item
            name="password"
            rules={[
              { required: true, message: 'Please input your new Password!' },
              { min: 8, message: 'Password must be at least 8 characters!' },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="New Password"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="confirm"
            dependencies={['password']}
            hasFeedback
            rules={[
              { required: true, message: 'Please confirm your password!' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(
                    new Error(
                      'The two passwords that you entered do not match!'
                    )
                  );
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Confirm Password"
              size="large"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              block
              size="large"
              loading={loading}
            >
              Reset Password
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default ResetPasswordPage;
