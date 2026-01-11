import React from 'react';
import { Tag, Tooltip } from 'antd';
import {
  ClockCircleOutlined,
  CheckCircleOutlined,
  SyncOutlined,
} from '@ant-design/icons';

import { SubscriptionTier, SubscriptionStatus as SubStatus } from '../types';

interface SubscriptionStatusProps {
  tier: SubscriptionTier;
  status?: SubStatus;
  expiresAt?: string | Date;
  cancelAtPeriodEnd?: boolean;
}

const SubscriptionStatus: React.FC<SubscriptionStatusProps> = ({
  tier,
  status,
  expiresAt,
  cancelAtPeriodEnd,
}) => {
  const getStatusColor = () => {
    if (status === SubStatus.ACTIVE) return 'success';
    if (status === SubStatus.PAST_DUE) return 'warning';
    if (status === SubStatus.CANCELED) return 'error';
    return 'default';
  };

  const formatDate = (date: string | Date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString();
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <Tag
        color={
          tier === SubscriptionTier.PRO ? 'blue' : tier === SubscriptionTier.ENTERPRISE ? 'purple' : 'default'
        }
      >
        {tier}
      </Tag>

      {status && (
        <Tag
          icon={
            status === SubStatus.ACTIVE ? (
              <CheckCircleOutlined />
            ) : (
              <ClockCircleOutlined />
            )
          }
          color={getStatusColor()}
        >
          {status}
        </Tag>
      )}

      {cancelAtPeriodEnd && (
        <Tooltip title={`Access until ${formatDate(expiresAt!)}`}>
          <Tag icon={<SyncOutlined spin={false} />} color="warning">
            CANCELING
          </Tag>
        </Tooltip>
      )}
    </div>
  );
};

export default SubscriptionStatus;
