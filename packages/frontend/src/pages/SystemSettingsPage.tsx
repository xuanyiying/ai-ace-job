import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Input,
  Switch,
  InputNumber,
  Button,
  Tabs,
  message,
  Typography,
  Divider,
  Space,
} from 'antd';
import {
  SettingOutlined,
  SafetyOutlined,
  MailOutlined,
  UserAddOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { adminService } from '../services/admin-service';
import './common.css';

const { Title, Text } = Typography;

interface SystemSettings {
  siteName: string;
  siteDescription: string;
  maintenanceMode: boolean;
  allowRegistration: boolean;
  requireEmailVerification: boolean;
  requireInviteCode: boolean;
  sessionTimeout: number;
  maxLoginAttempts: number;
  lockoutDuration: number;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword: string;
  fromEmail: string;
  fromName: string;
}

const SystemSettingsPage: React.FC = () => {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const settings = await adminService.getSystemSettings();
      form.setFieldsValue(settings);
    } catch {
      message.error(t('admin.system.load_failed'));
      // Set default values
      form.setFieldsValue({
        siteName: 'AI Resume Assistant',
        siteDescription: 'AI-powered resume optimization platform',
        maintenanceMode: false,
        allowRegistration: true,
        requireEmailVerification: true,
        requireInviteCode: false,
        sessionTimeout: 60,
        maxLoginAttempts: 5,
        lockoutDuration: 30,
        smtpHost: '',
        smtpPort: 587,
        smtpUser: '',
        smtpPassword: '',
        fromEmail: '',
        fromName: '',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async (values: SystemSettings) => {
    setSaving(true);
    try {
      await adminService.updateSystemSettings(values);
      message.success(t('admin.system.save_success'));
    } catch {
      message.error(t('admin.system.save_failed'));
    } finally {
      setSaving(false);
    }
  };

  const GeneralTab = () => (
    <div className="tab-content">
      <Title level={5}>{t('admin.system.general')}</Title>
      <Form.Item
        name="siteName"
        label={t('admin.system.site_name')}
        rules={[{ required: true }]}
      >
        <Input />
      </Form.Item>
      <Form.Item
        name="siteDescription"
        label={t('admin.system.site_description')}
      >
        <Input.TextArea rows={3} />
      </Form.Item>
      <Divider />
      <Form.Item
        name="maintenanceMode"
        label={t('admin.system.maintenance_mode')}
        valuePropName="checked"
      >
        <Switch />
      </Form.Item>
      <Text type="secondary">{t('admin.system.maintenance_mode_desc')}</Text>
    </div>
  );

  const RegistrationTab = () => (
    <div className="tab-content">
      <Title level={5}>{t('admin.system.registration')}</Title>
      <Form.Item
        name="allowRegistration"
        label={t('admin.system.allow_registration')}
        valuePropName="checked"
      >
        <Switch />
      </Form.Item>
      <Form.Item
        name="requireEmailVerification"
        label={t('admin.system.require_email_verification')}
        valuePropName="checked"
      >
        <Switch />
      </Form.Item>
      <Form.Item
        name="requireInviteCode"
        label={t('admin.system.require_invite_code')}
        valuePropName="checked"
      >
        <Switch />
      </Form.Item>
    </div>
  );

  const SecurityTab = () => (
    <div className="tab-content">
      <Title level={5}>{t('admin.system.security')}</Title>
      <Form.Item
        name="sessionTimeout"
        label={t('admin.system.session_timeout')}
        rules={[{ required: true }]}
      >
        <InputNumber min={5} max={1440} style={{ width: '100%' }} />
      </Form.Item>
      <Form.Item
        name="maxLoginAttempts"
        label={t('admin.system.max_login_attempts')}
        rules={[{ required: true }]}
      >
        <InputNumber min={1} max={20} style={{ width: '100%' }} />
      </Form.Item>
      <Form.Item
        name="lockoutDuration"
        label={t('admin.system.lockout_duration')}
        rules={[{ required: true }]}
      >
        <InputNumber min={1} max={1440} style={{ width: '100%' }} />
      </Form.Item>
    </div>
  );

  const EmailTab = () => (
    <div className="tab-content">
      <Title level={5}>{t('admin.system.email')}</Title>
      <Form.Item name="smtpHost" label={t('admin.system.smtp_host')}>
        <Input placeholder="smtp.example.com" />
      </Form.Item>
      <Form.Item name="smtpPort" label={t('admin.system.smtp_port')}>
        <InputNumber min={1} max={65535} style={{ width: '100%' }} />
      </Form.Item>
      <Form.Item name="smtpUser" label={t('admin.system.smtp_user')}>
        <Input />
      </Form.Item>
      <Form.Item name="smtpPassword" label={t('admin.system.smtp_password')}>
        <Input.Password placeholder={t('common.leave_empty_to_keep')} />
      </Form.Item>
      <Divider />
      <Form.Item name="fromEmail" label={t('admin.system.from_email')}>
        <Input placeholder="noreply@example.com" />
      </Form.Item>
      <Form.Item name="fromName" label={t('admin.system.from_name')}>
        <Input placeholder="AI Resume Assistant" />
      </Form.Item>
    </div>
  );

  const items = [
    {
      key: 'general',
      label: (
        <span>
          <SettingOutlined /> {t('admin.system.general')}
        </span>
      ),
      children: <GeneralTab />,
    },
    {
      key: 'registration',
      label: (
        <span>
          <UserAddOutlined /> {t('admin.system.registration')}
        </span>
      ),
      children: <RegistrationTab />,
    },
    {
      key: 'security',
      label: (
        <span>
          <SafetyOutlined /> {t('admin.system.security')}
        </span>
      ),
      children: <SecurityTab />,
    },
    {
      key: 'email',
      label: (
        <span>
          <MailOutlined /> {t('admin.system.email')}
        </span>
      ),
      children: <EmailTab />,
    },
  ];

  return (
    <div className="admin-container">
      <Card loading={loading}>
        <Title level={2} style={{ marginBottom: 24 }}>
          {t('admin.system.title')}
        </Title>

        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Tabs items={items} />

          <Divider />

          <Form.Item>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                icon={<SaveOutlined />}
                loading={saving}
              >
                {t('common.save')}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default SystemSettingsPage;
