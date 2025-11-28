import React from 'react';
import { Card, Typography } from 'antd';

const { Title, Paragraph, Text } = Typography;

const PrivacyPolicyPage: React.FC = () => {
  return (
    <div style={{ padding: '40px 20px', maxWidth: 1000, margin: '0 auto' }}>
      <Card>
        <Title level={1}>Privacy Policy</Title>
        <Text type="secondary">Last updated: November 28, 2024</Text>

        <Title level={2} style={{ marginTop: 32 }}>
          1. Information We Collect
        </Title>
        <Paragraph>
          We collect information that you provide directly to us, including:
          <ul>
            <li>Account information (email, name, password)</li>
            <li>Resume content and job descriptions you upload</li>
            <li>Payment information (processed securely through Stripe)</li>
            <li>Usage data and analytics</li>
          </ul>
        </Paragraph>

        <Title level={2}>2. How We Use Your Information</Title>
        <Paragraph>
          We use the information we collect to:
          <ul>
            <li>Provide, maintain, and improve our services</li>
            <li>Process your resume optimization requests</li>
            <li>Send you technical notices and support messages</li>
            <li>Respond to your comments and questions</li>
            <li>Monitor and analyze trends and usage</li>
          </ul>
        </Paragraph>

        <Title level={2}>3. Data Storage and Security</Title>
        <Paragraph>
          We implement appropriate technical and organizational measures to
          protect your personal data. Your data is stored securely using
          industry-standard encryption. Payment information is handled by our
          payment processor (Stripe) and is not stored on our servers.
        </Paragraph>

        <Title level={2}>4. AI Processing</Title>
        <Paragraph>
          Your resume content is processed by AI models to provide optimization
          suggestions. We do not use your data to train our AI models without
          your explicit consent.
        </Paragraph>

        <Title level={2}>5. Data Sharing</Title>
        <Paragraph>
          We do not sell your personal information. We may share your
          information with:
          <ul>
            <li>
              Service providers who assist in our operations (e.g., hosting,
              analytics)
            </li>
            <li>Law enforcement when required by law</li>
            <li>Other parties with your consent</li>
          </ul>
        </Paragraph>

        <Title level={2}>6. Your Rights</Title>
        <Paragraph>
          You have the right to:
          <ul>
            <li>Access your personal data</li>
            <li>Correct inaccurate data</li>
            <li>Request deletion of your data</li>
            <li>Export your data</li>
            <li>Withdraw consent at any time</li>
          </ul>
        </Paragraph>

        <Title level={2}>7. Cookies and Tracking</Title>
        <Paragraph>
          We use cookies and similar tracking technologies to track activity on
          our Service and hold certain information. You can instruct your
          browser to refuse all cookies or to indicate when a cookie is being
          sent.
        </Paragraph>

        <Title level={2}>8. Data Retention</Title>
        <Paragraph>
          We retain your personal information for as long as necessary to
          provide our services and as required by law. You may request deletion
          of your account at any time.
        </Paragraph>

        <Title level={2}>9. International Data Transfers</Title>
        <Paragraph>
          Your information may be transferred to and maintained on servers
          located outside of your state, province, country or other governmental
          jurisdiction where data protection laws may differ.
        </Paragraph>

        <Title level={2}>10. Children's Privacy</Title>
        <Paragraph>
          Our Service is not intended for use by children under the age of 13.
          We do not knowingly collect personal information from children under
          13.
        </Paragraph>

        <Title level={2}>11. Changes to This Policy</Title>
        <Paragraph>
          We may update our Privacy Policy from time to time. We will notify you
          of any changes by posting the new Privacy Policy on this page and
          updating the "Last updated" date.
        </Paragraph>

        <Title level={2}>12. Contact Us</Title>
        <Paragraph>
          If you have any questions about this Privacy Policy, please contact us
          at privacy@airesume.example.com
        </Paragraph>
      </Card>
    </div>
  );
};

export default PrivacyPolicyPage;
