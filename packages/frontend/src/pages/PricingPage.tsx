import React, { useState } from 'react';
import {
  Card,
  Button,
  Row,
  Col,
  Typography,
  List,
  message,
  Switch,
  Tag,
  Modal,
  Radio,
  Space,
} from 'antd';
import {
  CheckOutlined,
  CreditCardOutlined,
  AlipayCircleOutlined,
  WechatOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../stores/authStore';
import { paymentService } from '../services/payment-service';
import { loadPaddle } from '../utils/paddle-loader';
import './pricing.css';

const { Title, Text } = Typography;

const PricingPage: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [isYearly, setIsYearly] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedPriceId, setSelectedPriceId] = useState('');
  const [paymentProvider, setPaymentProvider] = useState<'stripe' | 'paddle'>(
    'stripe'
  );
  const { user } = useAuthStore();

  const handleUpgrade = (priceId: string) => {
    if (!user) {
      message.warning(t('pricing.login_required'));
      return;
    }
    setSelectedPriceId(priceId);
    setIsModalVisible(true);
  };

  const handleConfirmPayment = async () => {
    setLoading(true);
    try {
      if (paymentProvider === 'stripe') {
        const { url } = await paymentService.createCheckoutSession(
          selectedPriceId,
          'stripe'
        );
        if (url) {
          window.location.href = url;
        }
      } else {
        // Paddle
        const { transactionId } = await paymentService.createCheckoutSession(
          selectedPriceId,
          'paddle'
        );
        if (transactionId) {
          const paddle = await loadPaddle();
          paddle.Checkout.open({
            transactionId,
            settings: {
              successUrl: `${window.location.origin}/payment/success`,
            },
          });
          setIsModalVisible(false);
        }
      }
    } catch (error) {
      console.error('Failed to start checkout session:', error);
      message.error(t('pricing.payment_failed'));
    } finally {
      setLoading(false);
    }
  };

  const getPriceId = (tier: string) => {
    const isPaddle = paymentProvider === 'paddle';

    if (tier === 'Pro') {
      if (isYearly) {
        return isPaddle
          ? import.meta.env.VITE_PADDLE_PRICE_PRO_YEARLY
          : import.meta.env.VITE_STRIPE_PRICE_PRO_YEARLY;
      }
      return isPaddle
        ? import.meta.env.VITE_PADDLE_PRICE_PRO_MONTHLY
        : import.meta.env.VITE_STRIPE_PRICE_PRO_MONTHLY;
    }

    if (tier === 'Enterprise') {
      if (isYearly) {
        return isPaddle
          ? import.meta.env.VITE_PADDLE_PRICE_ENTERPRISE_YEARLY
          : import.meta.env.VITE_STRIPE_PRICE_ENTERPRISE_YEARLY;
      }
      return isPaddle
        ? import.meta.env.VITE_PADDLE_PRICE_ENTERPRISE_MONTHLY
        : import.meta.env.VITE_STRIPE_PRICE_ENTERPRISE_MONTHLY;
    }
    return '';
  };

  const tiers = [
    {
      title: t('pricing.free_title'),
      price: '$0',
      period: isYearly ? t('pricing.year_suffix') : t('pricing.month_suffix'),
      features: [
        t('pricing.features.basic_parsing'),
        t('pricing.features.standard_templates'),
        t('pricing.features.limited_optimizations'),
        t('pricing.features.watermark_export'),
      ],
      buttonText: t('pricing.current_plan'),
      isCurrent: user?.subscriptionTier === 'FREE',
      action: null,
    },
    {
      title: t('pricing.pro_title'),
      price: isYearly ? '$190' : '$19',
      period: isYearly ? t('pricing.year_suffix') : t('pricing.month_suffix'),
      save: isYearly ? t('pricing.save', { percent: 17 }) : null,
      features: [
        t('pricing.features.unlimited_parsing'),
        t('pricing.features.premium_templates'),
        t('pricing.features.unlimited_optimizations'),
        t('pricing.features.no_watermark'),
        t('pricing.features.cover_letter'),
        t('pricing.features.priority_support'),
      ],
      buttonText: t('pricing.upgrade_pro'),
      isCurrent: user?.subscriptionTier === 'PRO',
      action: () => handleUpgrade(getPriceId('Pro')),
      popular: true,
    },
    {
      title: t('pricing.enterprise_title'),
      price: isYearly ? '$990' : '$99',
      period: isYearly ? t('pricing.year_suffix') : t('pricing.month_suffix'),
      save: isYearly ? t('pricing.save', { percent: 17 }) : null,
      features: [
        t('pricing.features.everything_pro'),
        t('pricing.features.custom_templates'),
        t('pricing.features.api_access'),
        t('pricing.features.dedicated_manager'),
        t('pricing.features.sso'),
      ],
      buttonText: t('pricing.contact_sales'),
      isCurrent: user?.subscriptionTier === 'ENTERPRISE',
      action: () => handleUpgrade(getPriceId('Enterprise')),
    },
  ];

  return (
    <div
      className="pricing-container"
      style={{ padding: '40px 20px', maxWidth: 1200, margin: '0 auto' }}
    >
      <div style={{ textAlign: 'center', marginBottom: 60 }}>
        <Title className="pricing-title" level={1}>
          {t('pricing.title')}
        </Title>
        <Text
          className="pricing-subtitle"
          type="secondary"
          style={{ fontSize: 18, display: 'block', marginBottom: 24 }}
        >
          {t('pricing.subtitle')}
        </Text>

        <div
          className="pricing-switch-container"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
          }}
        >
          <Text strong={!isYearly}>{t('pricing.monthly')}</Text>
          <Switch checked={isYearly} onChange={setIsYearly} />
          <Text strong={isYearly}>
            {t('pricing.yearly')}{' '}
            <Tag color="green">{t('pricing.save', { percent: 17 })}</Tag>
          </Text>
        </div>
      </div>

      <Row gutter={[32, 32]} justify="center">
        {tiers.map((tier) => (
          <Col xs={24} md={8} key={tier.title}>
            <Card
              hoverable
              style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                borderColor: tier.popular ? '#1890ff' : undefined,
                borderWidth: tier.popular ? 2 : 1,
                position: 'relative',
              }}
              bodyStyle={{ flex: 1, display: 'flex', flexDirection: 'column' }}
            >
              {tier.popular && (
                <Tag
                  color="#1890ff"
                  style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    borderTopLeftRadius: 0,
                    borderBottomRightRadius: 0,
                  }}
                >
                  {t('pricing.most_popular')}
                </Tag>
              )}

              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <Title level={3}>{tier.title}</Title>
                <div style={{ marginBottom: 16 }}>
                  <Text style={{ fontSize: 36, fontWeight: 'bold' }}>
                    {tier.price}
                  </Text>
                  <Text type="secondary">{tier.period}</Text>
                </div>
              </div>

              <List
                dataSource={tier.features}
                renderItem={(item) => (
                  <List.Item style={{ border: 'none', padding: '8px 0' }}>
                    <CheckOutlined
                      style={{ color: '#52c41a', marginRight: 8 }}
                    />
                    {item}
                  </List.Item>
                )}
                style={{ marginBottom: 32, flex: 1 }}
              />

              <Button
                type={tier.popular ? 'primary' : 'default'}
                size="large"
                block
                onClick={tier.action || undefined}
                disabled={tier.isCurrent || !tier.action}
                loading={loading && !tier.isCurrent && !!tier.action}
              >
                {tier.isCurrent ? t('pricing.current_plan') : tier.buttonText}
              </Button>
            </Card>
          </Col>
        ))}
      </Row>

      <Modal
        title={t('pricing.select_method')}
        open={isModalVisible}
        onOk={handleConfirmPayment}
        onCancel={() => setIsModalVisible(false)}
        confirmLoading={loading}
        okText={t('pricing.proceed')}
        cancelText={t('common.cancel')}
      >
        <div style={{ padding: '20px 0' }}>
          <Radio.Group
            onChange={(e) => setPaymentProvider(e.target.value)}
            value={paymentProvider}
            style={{ width: '100%' }}
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              <Radio
                value="stripe"
                style={{
                  padding: '10px',
                  border: '1px solid #f0f0f0',
                  borderRadius: '8px',
                  width: '100%',
                }}
              >
                <Space>
                  <CreditCardOutlined
                    style={{ fontSize: '20px', color: '#1890ff' }}
                  />
                  <div>
                    <Text strong>{t('pricing.credit_card')}</Text>
                    <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
                      {t('pricing.stripe_desc')}
                    </div>
                  </div>
                </Space>
              </Radio>
              <Radio
                value="paddle"
                style={{
                  padding: '10px',
                  border: '1px solid #f0f0f0',
                  borderRadius: '8px',
                  width: '100%',
                }}
              >
                <Space>
                  <AlipayCircleOutlined
                    style={{ fontSize: '20px', color: '#1677ff' }}
                  />
                  <WechatOutlined
                    style={{ fontSize: '20px', color: '#52c41a' }}
                  />
                  <div>
                    <Text strong>{t('pricing.alipay_wechat')}</Text>
                    <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
                      {t('pricing.paddle_desc')}
                    </div>
                  </div>
                </Space>
              </Radio>
            </Space>
          </Radio.Group>
        </div>
      </Modal>
    </div>
  );
};

export default PricingPage;
