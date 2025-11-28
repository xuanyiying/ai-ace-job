import React, { useState } from 'react';
import { Card, Button, Row, Col, Typography, List, message } from 'antd';
import { CheckOutlined } from '@ant-design/icons';
import axios from '../config/axios';
import { useAuthStore } from '../stores/authStore';

const { Title, Text } = Typography;

const PricingPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const { user } = useAuthStore();

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      // Replace with your actual Stripe Price ID
      const priceId = 'price_1234567890';
      const response = await axios.post('/payments/create-checkout-session', {
        priceId,
      });

      if (response.data.url) {
        window.location.href = response.data.url;
      }
    } catch (error) {
      console.error('Failed to start checkout session:', error);
      message.error('Failed to start payment process. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const tiers = [
    {
      title: 'Free',
      price: '$0',
      period: '/month',
      features: [
        'Basic Resume Parsing',
        'Standard Templates',
        '3 Optimizations / Month',
        'PDF Export (Watermarked)',
      ],
      buttonText: 'Current Plan',
      isCurrent: user?.subscriptionTier === 'free',
      action: null,
    },
    {
      title: 'Pro',
      price: '$19',
      period: '/month',
      features: [
        'Unlimited Parsing',
        'Premium Templates',
        'Unlimited Optimizations',
        'No Watermark',
        'Cover Letter Generation',
        'Priority Support',
      ],
      buttonText: 'Upgrade to Pro',
      isCurrent: user?.subscriptionTier === 'pro',
      action: handleUpgrade,
    },
  ];

  return (
    <div style={{ padding: '40px 20px', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 60 }}>
        <Title level={1}>Simple, Transparent Pricing</Title>
        <Text type="secondary" style={{ fontSize: 18 }}>
          Choose the plan that best fits your career goals.
        </Text>
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
                borderColor: tier.title === 'Pro' ? '#1890ff' : undefined,
                borderWidth: tier.title === 'Pro' ? 2 : 1,
              }}
              bodyStyle={{ flex: 1, display: 'flex', flexDirection: 'column' }}
            >
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
                type={tier.title === 'Pro' ? 'primary' : 'default'}
                size="large"
                block
                onClick={tier.action || undefined}
                disabled={tier.isCurrent}
                loading={tier.title === 'Pro' && loading}
              >
                {tier.isCurrent ? 'Current Plan' : tier.buttonText}
              </Button>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
};

export default PricingPage;
